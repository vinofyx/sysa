import {
  fakeRazorpayPayment,
  db,
  fakePrisma,
  resetDb,
  seedPendingDonation,
  type SeedOptions,
} from './helpers/receipt-flow-harness';

import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { Writable } from 'node:stream';

import winston from 'winston';

import { env } from '@config/env';
import { logger } from '@lib/logger';
import { evaluateSmtpResult, getMailer, sendMail } from '@integrations/email/mailer';
import { getRazorpayClient } from '@integrations/payments/razorpay.client';
import { ApiError } from '@utils/api-error';
import { getDonationStatus, initiateDonation } from '@services/donation-checkout.service';
import { randomUUID } from 'node:crypto';
import { verifyAndCompletePayment } from '@services/payment-verification.service';
import { retryReceiptEmail, retryReceiptWhatsApp } from '@services/receipt.service';
import { processRazorpayWebhook } from '@services/webhook.service';
import { resolveDonor } from '@services/donor-resolution.service';
import {
  isAuthorizedDeliveryReport,
  isDeliveryReportEndpointEnabled,
  processWhatsAppDeliveryReport,
} from '@services/whatsapp-delivery-report.service';
import { initiateDonationSchema } from '@validation/donation-checkout.schema';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_COOKIE } from '@config/constants';
import { signAccessToken, verifyAccessToken } from '@lib/jwt';
import { runDeliveryRetriesOnce } from '../jobs/delivery-retry.worker';
import { RETRY_BACKOFF_MS } from '@services/receipt.service';
import { adminIdFromRequest, donationCheckoutRouter } from '@routes/v1/donation-checkout.routes';
import {
  signDonationAccessToken,
  signDonorToken,
  signReceiptAccessToken,
  verifyDonationAccessToken,
  verifyReceiptAccessToken,
} from '@lib/donor-jwt';
import { buildReceiptDownloadUrl } from '@lib/receipt-link';
import { requestLogger } from '@middleware/request-logger.middleware';
import { issueReceipt, retryFailedDeliveries } from '@services/receipt.service';

import { extractPdfText } from './helpers/pdf-text';
import { assertPdf, receiptMedia } from '@integrations/storage/receipt-media';
import { redactSecrets } from '@utils/redact-secrets';

const WHATSAPP_URL_FRAGMENT = 'whatsapp-outbound-message';
const SMS_URL_FRAGMENT = '/flow';

interface SentMail {
  to: string;
  subject: string;
  text: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

interface WhatsAppCall {
  headers: Record<string, string>;
  body: {
    integrated_number: string;
    payload: {
      template: {
        name: string;
        to_and_components: Array<{
          to: string[];
          components: Record<string, { type: string; value: string }>;
        }>;
      };
    };
  };
}

let razorpayStatus = 'captured';
let razorpayOverrides: Record<string, unknown> = {};
let smtpAccepts = true;
/** 5xx = permanent recipient rejection; 4xx = temporary (retryable). */
let smtpRejectResponse = '550 mailbox unavailable';
/** When set, only mail to this address is rejected (per-recipient failure). */
let smtpRejectOnlyTo: string | null = null;
let whatsappOk = true;
let whatsappErrorMessage = 'Template variables mismatch';
let whatsappFailHttp = 400;
let whatsappFailBody: Record<string, unknown> | null = null;
let sentMail: SentMail[] = [];
let whatsappCalls: WhatsAppCall[] = [];
let smsCalls = 0;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  resetDb();
  razorpayStatus = 'captured';
  razorpayOverrides = {};
  smtpAccepts = true;
  smtpRejectResponse = '550 mailbox unavailable';
  smtpRejectOnlyTo = null;
  whatsappOk = true;
  whatsappErrorMessage = 'Template variables mismatch';
  whatsappFailHttp = 400;
  whatsappFailBody = null;
  sentMail = [];
  whatsappCalls = [];
  smsCalls = 0;

  mock.method(getRazorpayClient().payments, 'fetch', async (paymentId: string) =>
    fakeRazorpayPayment(paymentId, razorpayStatus, razorpayOverrides),
  );

  mock.method(getMailer(), 'sendMail', async (message: SentMail) => {
    sentMail.push(message);
    const accepted = smtpAccepts && !(smtpRejectOnlyTo && message.to === smtpRejectOnlyTo);
    return accepted
      ? {
          accepted: [message.to],
          rejected: [],
          messageId: `<m${sentMail.length}@test>`,
          response: '250 OK',
        }
      : {
          accepted: [],
          rejected: [message.to],
          messageId: null,
          response: smtpRejectResponse,
        };
  });

  mock.method(globalThis, 'fetch', async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes(WHATSAPP_URL_FRAGMENT)) {
      whatsappCalls.push({
        headers: init?.headers as Record<string, string>,
        body: JSON.parse(String(init?.body)),
      });
      return whatsappOk
        ? jsonResponse(200, {
            status: 'success',
            hasError: false,
            data: { request_id: `wa-${whatsappCalls.length}` },
          })
        : jsonResponse(
            whatsappFailHttp,
            whatsappFailBody ?? { status: 'fail', hasError: true, message: whatsappErrorMessage },
          );
    }
    if (url.includes(SMS_URL_FRAGMENT)) {
      smsCalls += 1;
      return jsonResponse(200, { type: 'success', message: `sms-${smsCalls}` });
    }
    throw new Error(`Unexpected outbound request in test: ${url}`);
  });
});

afterEach(() => {
  mock.restoreAll();
});

function checkoutSignature(orderId: string, paymentId: string): string {
  return createHmac('sha256', env.RAZORPAY_KEY_SECRET as string)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

function webhookRequest(orderId: string, paymentId: string): { raw: Buffer; signature: string } {
  const raw = Buffer.from(
    JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: paymentId, order_id: orderId, method: 'upi' } } },
    }),
  );
  const signature = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET as string)
    .update(raw.toString('utf8'))
    .digest('hex');
  return { raw, signature };
}

async function payAndVerify(seed: SeedOptions = {}) {
  const { donationId, orderId } = seedPendingDonation(seed);
  const paymentId = `pay_${donationId.slice(0, 8)}`;
  const input = {
    donationId,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: checkoutSignature(orderId, paymentId),
  };
  await verifyAndCompletePayment(input);
  return { donationId, orderId, paymentId, input };
}

function receiptsFor(donationId: string) {
  return [...db.receipts.values()].filter((r) => r.donationId === donationId);
}

/** Donor-addressed mail only — every verified payment also sends the
 * organisation copy to ORG_RECEIPT_EMAIL (covered in
 * post-payment-notifications.test.ts). */
function donorMail(): SentMail[] {
  return sentMail.filter((mail) => mail.to !== env.ORG_RECEIPT_EMAIL);
}

describe('Receipt delivery after verified payment', () => {
  it('creates exactly one receipt and delivers it by email (PDF) and WhatsApp', async () => {
    const { donationId, paymentId } = await payAndVerify({ amount: 2500 });

    const donation = db.donations.get(donationId);
    assert.equal(donation?.status, 'completed');

    const receipts = receiptsFor(donationId);
    assert.equal(receipts.length, 1);
    const receipt = receipts[0];
    const receiptNumber = receipt.receiptNumber as string;
    assert.match(receiptNumber, /^RCPT-\d{4}-\d{6}$/);
    assert.equal(receipt.emailStatus, 'sent');
    assert.equal(receipt.emailMessageId, '<m1@test>');
    assert.ok(receipt.emailSentAt instanceof Date);
    assert.equal(receipt.whatsappStatus, 'sent');
    assert.equal(receipt.whatsappMessageId, 'wa-1');
    assert.ok(receipt.whatsappSentAt instanceof Date);

    // Email: registered address, spec subject, correct amount/ids, PDF attached.
    assert.equal(donorMail().length, 1);
    const mail = donorMail()[0];
    assert.equal(mail.to, 'ravi.kumar@example.com');
    assert.equal(
      mail.subject,
      `Donation Receipt — Sai Yadadri Seva Ashram — Receipt ${receiptNumber}`,
    );
    assert.match(mail.text, /2,500/);
    assert.ok(mail.text.includes(paymentId));
    assert.ok(mail.text.includes('Donor Name: Ravi Kumar'));
    assert.ok(mail.text.includes(`Receipt Number: ${receiptNumber}`));
    assert.ok(mail.text.includes('Donation Category: Annadanam'));
    assert.ok(mail.text.includes('Amount: ₹2,500'));
    assert.ok(mail.text.includes(`Razorpay Payment ID: ${paymentId}`));
    assert.ok(
      mail.text.includes(`Razorpay Order ID: ${db.donations.get(donationId)?.razorpayOrderId}`),
    );
    assert.ok(mail.text.includes('Payment Status: Paid Successfully'));
    assert.equal(mail.attachments?.length, 1);
    const [pdf] = mail.attachments ?? [];
    assert.equal(pdf.contentType, 'application/pdf');
    assert.equal(pdf.filename, `${receiptNumber}.pdf`);
    assert.equal(pdf.content.subarray(0, 5).toString('latin1'), '%PDF-');
    // The attached PDF is this donation's receipt, not just any PDF.
    const pdfLines = extractPdfText(pdf.content);
    for (const expected of [
      receiptNumber,
      'Ravi Kumar',
      'Annadanam',
      'INR 2,500',
      paymentId,
      'Paid Successfully',
    ]) {
      assert.ok(pdfLines.includes(expected), `attached PDF is missing "${expected}"`);
    }

    // WhatsApp: customer's number (not the business sender), approved
    // template, backend-only authkey, mapped variables.
    assert.equal(whatsappCalls.length, 1);
    const call = whatsappCalls[0];
    assert.equal(call.headers.authkey, env.MSG91_AUTHKEY);
    assert.equal(call.body.integrated_number, '919490118877');
    const template = call.body.payload.template;
    assert.equal(template.name, 'sysa_donation_receipt');
    const [recipient] = template.to_and_components;
    assert.deepEqual(recipient.to, ['919876543210']);
    assert.equal(recipient.components.body_1.value, 'Ravi Kumar');
    assert.equal(recipient.components.body_2.value, '2,500');
    assert.equal(recipient.components.body_3.value, receiptNumber);
  });

  it('does not duplicate the receipt or deliveries on repeated frontend verify callbacks', async () => {
    const { donationId, input } = await payAndVerify();
    await verifyAndCompletePayment(input);
    await verifyAndCompletePayment(input);

    assert.equal(receiptsFor(donationId).length, 1);
    assert.equal(donorMail().length, 1);
    assert.equal(whatsappCalls.length, 1);
  });

  it('does not duplicate on webhook redelivery or webhook-after-verify', async () => {
    const { donationId, orderId, paymentId } = await payAndVerify();
    const { raw, signature } = webhookRequest(orderId, paymentId);
    await processRazorpayWebhook(raw, signature);
    await processRazorpayWebhook(raw, signature);

    assert.equal(receiptsFor(donationId).length, 1);
    assert.equal(donorMail().length, 1);
    assert.equal(whatsappCalls.length, 1);
  });

  it('sends once when verify and webhook race each other', async () => {
    const { donationId, orderId } = seedPendingDonation();
    const paymentId = 'pay_race';
    const { raw, signature } = webhookRequest(orderId, paymentId);
    await Promise.all([
      verifyAndCompletePayment({
        donationId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: checkoutSignature(orderId, paymentId),
      }),
      processRazorpayWebhook(raw, signature),
    ]);

    assert.equal(receiptsFor(donationId).length, 1);
    assert.equal(donorMail().length, 1);
    assert.equal(whatsappCalls.length, 1);
  });

  it('never issues a receipt or sends anything for an invalid checkout signature', async () => {
    const { donationId, orderId } = seedPendingDonation();
    await assert.rejects(
      () =>
        verifyAndCompletePayment({
          donationId,
          razorpayOrderId: orderId,
          razorpayPaymentId: 'pay_forged',
          razorpaySignature: 'forged-signature',
        }),
      (error: unknown) => error instanceof ApiError && error.statusCode === 400,
    );

    assert.equal(db.donations.get(donationId)?.status, 'failed');
    assert.equal(receiptsFor(donationId).length, 0);
    assert.equal(sentMail.length, 0);
    assert.equal(whatsappCalls.length, 0);
    assert.equal(smsCalls, 0);
  });

  it('never issues a receipt when Razorpay reports the payment as not captured', async () => {
    razorpayStatus = 'authorized';
    const { donationId, orderId } = seedPendingDonation();
    const paymentId = 'pay_uncaptured';
    await assert.rejects(() =>
      verifyAndCompletePayment({
        donationId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: checkoutSignature(orderId, paymentId),
      }),
    );

    assert.notEqual(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receiptsFor(donationId).length, 0);
    assert.equal(sentMail.length, 0);
    assert.equal(whatsappCalls.length, 0);
  });

  it('keeps the payment successful when WhatsApp fails, and email still goes out', async () => {
    whatsappOk = false;
    const { donationId } = await payAndVerify();

    assert.equal(db.donations.get(donationId)?.status, 'completed');
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.whatsappStatus, 'failed');
    // HTTP 400 from MSG91 is a permanent rejection — marked so it is never auto-resent.
    assert.equal(
      receipt.whatsappFailureReason,
      '[not retried automatically] Template variables mismatch',
    );
    assert.equal(receipt.emailStatus, 'sent');
  });

  it('keeps the payment successful when email fails, and WhatsApp still goes out', async () => {
    smtpAccepts = false;
    const { donationId } = await payAndVerify();

    assert.equal(db.donations.get(donationId)?.status, 'completed');
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.emailStatus, 'failed');
    assert.match(String(receipt.emailFailureReason), /SMTP rejected/);
    assert.equal(receipt.whatsappStatus, 'sent');
  });

  it('handles a donor with no mobile number: email only, no WhatsApp/SMS', async () => {
    const { donationId } = await payAndVerify({ phone: null });

    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.emailStatus, 'sent');
    assert.equal(receipt.whatsappStatus, 'skipped');
    assert.equal(receipt.whatsappFailureReason, 'No mobile number is on file');
    assert.equal(receipt.smsStatus, 'skipped');
    assert.equal(whatsappCalls.length, 0);
    assert.equal(smsCalls, 0);
  });

  it('handles a donor with no email address: WhatsApp only, no email', async () => {
    const { donationId } = await payAndVerify({ email: null });

    const [receipt] = receiptsFor(donationId);
    // Only the donor email is skipped (with the reason); other channels still go out.
    assert.equal(receipt.emailStatus, 'skipped');
    assert.equal(receipt.emailFailureReason, 'No email address was provided for this donation');
    assert.equal(receipt.orgEmailStatus, 'sent');
    assert.equal(donorMail().length, 0);
    assert.equal(receipt.whatsappStatus, 'sent');
  });

  it('resends a failed WhatsApp against the same receipt number, and is a no-op once sent', async () => {
    whatsappOk = false;
    whatsappFailHttp = 503; // transient — a donor-initiated resend is allowed
    const { donationId } = await payAndVerify();
    const [before] = receiptsFor(donationId);
    const failedAttempts = whatsappCalls.length;

    whatsappOk = true;
    assert.equal(await retryReceiptWhatsApp(donationId), 'sent');
    assert.equal(await retryReceiptWhatsApp(donationId), 'sent');

    const after = receiptsFor(donationId);
    assert.equal(after.length, 1);
    assert.equal(after[0].receiptNumber, before.receiptNumber);
    assert.equal(after[0].whatsappStatus, 'sent');
    assert.equal(whatsappCalls.length, failedAttempts + 1);
  });

  it('resends a failed email with the PDF against the same receipt, without touching the payment', async () => {
    smtpAccepts = false;
    smtpRejectResponse = '451 4.3.0 temporary local problem'; // transient
    const { donationId } = await payAndVerify({ amount: 1001 });
    const [before] = receiptsFor(donationId);
    const paymentBefore = { ...db.donations.get(donationId) };
    const attemptsBefore = donorMail().length;

    smtpAccepts = true;
    assert.equal(await retryReceiptEmail(donationId), 'sent');
    assert.equal(await retryReceiptEmail(donationId), 'sent');

    const after = receiptsFor(donationId);
    assert.equal(after.length, 1);
    assert.equal(after[0].receiptNumber, before.receiptNumber);
    assert.equal(after[0].emailStatus, 'sent');
    assert.equal(donorMail().length, attemptsBefore + 1);
    const resent = donorMail().at(-1);
    assert.equal(
      resent?.subject,
      `Donation Receipt — Sai Yadadri Seva Ashram — Receipt ${before.receiptNumber as string}`,
    );
    assert.equal(resent?.attachments?.[0].content.subarray(0, 5).toString('latin1'), '%PDF-');
    const paymentAfter = db.donations.get(donationId);
    assert.equal(String(paymentAfter?.amount), String(paymentBefore.amount));
    assert.equal(paymentAfter?.status, 'completed');
    assert.equal(paymentAfter?.paymentGatewayRef, paymentBefore.paymentGatewayRef);
  });

  it('never returns provider credentials in the donor-facing status response', async () => {
    whatsappOk = false;
    const { donationId } = await payAndVerify();
    const body = JSON.stringify(await getDonationStatus(donationId));

    for (const secret of [
      env.MSG91_AUTHKEY,
      env.SMTP_PASSWORD,
      env.RAZORPAY_KEY_SECRET,
      env.RAZORPAY_WEBHOOK_SECRET,
    ]) {
      assert.ok(secret && !body.includes(secret), 'status response leaked a credential');
    }
  });
});

/** Captures everything the app logs, at every level, AFTER the logger's
 * own formats (so redaction is exercised exactly as in production). */
function captureLogs(): { lines: string[]; stop: () => void } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(String(chunk));
      done();
    },
  });
  const transport = new winston.transports.Stream({ stream, format: winston.format.json() });
  const previousLevel = logger.level;
  const silenced = logger.transports.filter((t) => !t.silent);
  silenced.forEach((t) => (t.silent = true));
  logger.level = 'debug';
  logger.add(transport);
  return {
    lines,
    stop: () => {
      logger.remove(transport);
      logger.level = previousLevel;
      silenced.forEach((t) => (t.silent = false));
    },
  };
}

describe('Credential and data safety in delivery failures', () => {
  it('redacts credentials a provider echoes back — in logs, stored errors and API responses', async () => {
    whatsappOk = false;
    whatsappErrorMessage = `Invalid authkey ${env.MSG91_AUTHKEY} for integrated number`;
    smtpAccepts = false;
    const capture = captureLogs();
    let donationId: string;
    try {
      ({ donationId } = await payAndVerify());
    } finally {
      capture.stop();
    }

    const [receipt] = receiptsFor(donationId);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(
      receipt.whatsappFailureReason,
      '[not retried automatically] Invalid authkey [REDACTED] for integrated number',
    );

    const logText = capture.lines.join('\n');
    const statusBody = JSON.stringify(await getDonationStatus(donationId));
    assert.ok(capture.lines.length > 0, 'expected log output to inspect');
    for (const secret of [env.MSG91_AUTHKEY, env.SMTP_PASSWORD, env.RAZORPAY_KEY_SECRET]) {
      assert.ok(secret, 'test secret must be configured');
      assert.ok(!logText.includes(secret), 'a credential was written to the logs');
      assert.ok(!statusBody.includes(secret), 'a credential was returned by the API');
    }
    // Donor PII is masked in logs as well.
    assert.ok(!logText.includes('9876543210'), 'full mobile number was logged');
    assert.ok(!logText.includes('ravi.kumar@example.com'), 'full email address was logged');
  });

  it('fails WhatsApp up front (payment unaffected) when the template needs a PDF URL that is not public', async () => {
    const previous = env.MSG91_WHATSAPP_TEMPLATE_VARS;
    env.MSG91_WHATSAPP_TEMPLATE_VARS = JSON.stringify({
      header_1: 'document',
      body_1: 'customerName',
    });
    try {
      const { donationId } = await payAndVerify();
      const [receipt] = receiptsFor(donationId);
      assert.equal(db.donations.get(donationId)?.status, 'completed');
      assert.equal(receipt.whatsappStatus, 'failed');
      assert.match(
        String(receipt.whatsappFailureReason),
        /Receipt document could not be prepared for WhatsApp: .*not configured/,
      );
      assert.equal(whatsappCalls.length, 0);
      assert.equal(receipt.emailStatus, 'sent');
    } finally {
      env.MSG91_WHATSAPP_TEMPLATE_VARS = previous;
    }
  });

  it('never sends WhatsApp to an invalid registered mobile, and keeps the payment', async () => {
    const { donationId } = await payAndVerify({ phone: '12345' });
    const [receipt] = receiptsFor(donationId);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receipt.whatsappStatus, 'failed');
    assert.equal(receipt.whatsappFailureReason, 'Recipient mobile number is invalid');
    assert.equal(whatsappCalls.length, 0);
    assert.equal(receipt.emailStatus, 'sent');
  });
});

function signedWebhook(body: unknown): { raw: Buffer; signature: string } {
  const raw = Buffer.from(JSON.stringify(body));
  const signature = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET as string)
    .update(raw.toString('utf8'))
    .digest('hex');
  return { raw, signature };
}

describe('Payment must match the donation before it is receipted', () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['amount', { amount: 1 }],
    ['currency', { currency: 'USD' }],
    ['order_id', { order_id: 'order_someone_else' }],
  ];
  for (const [field, overrides] of cases) {
    it(`does not complete, receipt or notify when the captured payment's ${field} differs`, async () => {
      razorpayOverrides = overrides;
      const { donationId, orderId } = seedPendingDonation({ amount: 2500 });
      const paymentId = `pay_${donationId.slice(0, 8)}`;
      await assert.rejects(
        () =>
          verifyAndCompletePayment({
            donationId,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: checkoutSignature(orderId, paymentId),
          }),
        (error: unknown) => error instanceof ApiError && error.statusCode === 409,
      );
      // Stays pending for review (money may really have been captured).
      assert.equal(db.donations.get(donationId)?.status, 'pending');
      assert.equal(receiptsFor(donationId).length, 0);
      assert.equal(sentMail.length, 0);
      assert.equal(whatsappCalls.length, 0);
      assert.equal(smsCalls, 0);
    });
  }
});

describe('Out-of-order and blocked deliveries', () => {
  it('ignores a payment.failed webhook that arrives after the payment was captured', async () => {
    const { donationId, orderId, paymentId } = await payAndVerify();
    const { raw, signature } = signedWebhook({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: { id: paymentId, order_id: orderId, error_description: 'late failure' },
        },
      },
    });
    await processRazorpayWebhook(raw, signature);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receiptsFor(donationId).length, 1);
    assert.equal(donorMail().length, 1);
  });

  it('treats Meta 131049 as permanent: one attempt, never auto-resent, email unaffected, admin-only resend', async () => {
    whatsappOk = false;
    whatsappFailHttp = 200; // MSG91 can report the Meta error in a 200 body
    whatsappFailBody = {
      hasError: true,
      status: 'fail',
      message: 'Message failed to send',
      errors: [
        {
          code: 131049,
          title: 'This message was not delivered to maintain healthy ecosystem engagement.',
        },
      ],
    };
    const { donationId, orderId, paymentId, input } = await payAndVerify();

    const [receipt] = receiptsFor(donationId);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receipt.whatsappStatus, 'failed');
    assert.match(
      String(receipt.whatsappFailureReason),
      /^\[not retried automatically\] Meta 131049/,
    );
    assert.equal(whatsappCalls.length, 1, 'no in-process retries for a permanent rejection');
    assert.equal(receipt.emailStatus, 'sent');

    // Success-page refreshes and Razorpay webhook retries must not resend it.
    whatsappOk = true;
    await verifyAndCompletePayment(input);
    const { raw, signature } = signedWebhook({
      event: 'payment.captured',
      payload: { payment: { entity: { id: paymentId, order_id: orderId, method: 'upi' } } },
      redelivery: 1,
    });
    await processRazorpayWebhook(raw, signature);
    assert.equal(whatsappCalls.length, 1);

    // Donor-initiated resend is refused; an admin can explicitly override.
    await assert.rejects(
      () => retryReceiptWhatsApp(donationId),
      (error: unknown) => error instanceof ApiError && error.statusCode === 409,
    );
    assert.equal(whatsappCalls.length, 1);
    assert.equal(await retryReceiptWhatsApp(donationId, { overridePermanent: true }), 'sent');
    assert.equal(whatsappCalls.length, 2);
    assert.equal(receiptsFor(donationId).length, 1);
    assert.equal(donorMail().length, 1, 'no duplicate donor email from any of the retries');
    assert.equal(
      sentMail.filter((mail) => mail.to === env.ORG_RECEIPT_EMAIL).length,
      1,
      'no duplicate organisation email from any of the retries',
    );
  });

  it('retries a transient MSG91 failure (HTTP 503) a bounded number of times', async () => {
    whatsappOk = false;
    whatsappFailHttp = 503;
    whatsappErrorMessage = 'Service temporarily unavailable';
    const { donationId } = await payAndVerify();
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.whatsappStatus, 'failed');
    assert.equal(receipt.whatsappFailureReason, 'Service temporarily unavailable');
    assert.equal(whatsappCalls.length, 3);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
  });
});

describe('Success page in notification dry-run mode', () => {
  it('reports dry-run so the page never shows deliberately unsent channels as failures', async () => {
    const previous = env.NOTIFICATIONS_MODE;
    env.NOTIFICATIONS_MODE = 'dry_run';
    try {
      const { donationId } = await payAndVerify();
      const status = await getDonationStatus(donationId);
      assert.equal(status.notificationsDryRun, true);
      assert.equal(status.receiptNumber, receiptsFor(donationId)[0].receiptNumber);
      assert.equal(whatsappCalls.length, 0);
      assert.equal(sentMail.length, 0);
      assert.equal(smsCalls, 0);
    } finally {
      env.NOTIFICATIONS_MODE = previous;
    }
    const { donationId } = await payAndVerify();
    assert.equal((await getDonationStatus(donationId)).notificationsDryRun, false);
  });

  it('after switching to live, a dry-run receipt reads "not sent yet" (not failed) and a resend delivers donor + org email once', async () => {
    const previous = env.NOTIFICATIONS_MODE;
    env.NOTIFICATIONS_MODE = 'dry_run';
    let donationId: string;
    try {
      ({ donationId } = await payAndVerify({ whatsappReceiptConsent: false }));
    } finally {
      env.NOTIFICATIONS_MODE = previous;
    }
    const [before] = receiptsFor(donationId);
    assert.equal(sentMail.length, 0);

    const status = await getDonationStatus(donationId);
    assert.equal(status.notificationsDryRun, false);
    assert.equal(status.emailStatus, 'not_configured');
    assert.equal(status.emailHeldByDryRun, true);
    // No opt-in: WhatsApp is skipped, not held, and never sent.
    assert.equal(status.whatsappStatus, 'skipped');
    assert.equal(status.whatsappHeldByDryRun, false);

    assert.equal(await retryReceiptEmail(donationId), 'sent');
    assert.equal(await retryReceiptEmail(donationId), 'sent');

    const after = receiptsFor(donationId);
    assert.equal(after.length, 1);
    assert.equal(after[0].receiptNumber, before.receiptNumber);
    assert.equal(after[0].emailStatus, 'sent');
    assert.equal(after[0].orgEmailStatus, 'sent');
    assert.equal(donorMail().length, 1);
    assert.equal(sentMail.filter((mail) => mail.to === env.ORG_RECEIPT_EMAIL).length, 1);
    assert.equal(whatsappCalls.length, 0);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal((await getDonationStatus(donationId)).emailHeldByDryRun, false);
  });
});

describe('WhatsApp receipt consent', () => {
  it('never sends WhatsApp without an explicit opt-in, while email and SMS still go out', async () => {
    const { donationId } = await payAndVerify({ whatsappReceiptConsent: false });
    const [receipt] = receiptsFor(donationId);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(whatsappCalls.length, 0);
    assert.equal(receipt.whatsappStatus, 'skipped');
    assert.equal(receipt.whatsappFailureReason, 'Donor did not opt in to WhatsApp receipts');
    assert.equal(receipt.emailStatus, 'sent');
    assert.equal(smsCalls, 1);

    const status = await getDonationStatus(donationId);
    assert.equal(status.whatsappConsent, false);

    // Consent is the donor's to give — not even an admin resend overrides it.
    await assert.rejects(
      () => retryReceiptWhatsApp(donationId, { overridePermanent: true }),
      (error: unknown) => error instanceof ApiError && error.statusCode === 400,
    );
    assert.equal(whatsappCalls.length, 0);
  });

  it('defaults consent to false at checkout validation', () => {
    const parsed = initiateDonationSchema.parse({
      donorName: 'Ravi Kumar',
      donorPhone: '9876543210',
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123456789012',
      categoryId: '00000000-0000-4000-8000-000000000000',
      amount: 501,
      idempotencyKey: 'idem-key-123',
    });
    assert.equal(parsed.whatsappReceiptConsent, false);
  });

  it('records consent only for the phone owner, and the latest choice (including withdrawal) wins', async () => {
    const owner = await resolveDonor({
      donorName: 'Ravi Kumar',
      donorPhone: '+91 98765 00001',
      donorEmail: 'owner@example.com',
      whatsappReceiptConsent: true,
    });
    assert.equal(db.donors.get(owner.id)?.whatsappReceiptConsent, true);
    assert.ok(db.donors.get(owner.id)?.whatsappConsentUpdatedAt instanceof Date);

    await resolveDonor({
      donorName: 'Ravi Kumar',
      donorPhone: '9876500001',
      whatsappReceiptConsent: false,
    });
    assert.equal(db.donors.get(owner.id)?.whatsappReceiptConsent, false);

    // Someone else using the owner's email but a different phone matches via
    // the email fallback — they must not change the owner's WhatsApp consent.
    const viaEmail = await resolveDonor({
      donorName: 'Someone Else',
      donorPhone: '9876500002',
      donorEmail: 'owner@example.com',
      whatsappReceiptConsent: true,
    });
    assert.equal(viaEmail.id, owner.id);
    assert.equal(db.donors.get(owner.id)?.whatsappReceiptConsent, false);
  });
});

describe('MSG91 WhatsApp delivery reports', () => {
  const SECRET = 'test-webhook-secret-0123456789';
  let previousSecret: string | undefined;
  beforeEach(() => {
    previousSecret = env.MSG91_WEBHOOK_SECRET;
    env.MSG91_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    env.MSG91_WEBHOOK_SECRET = previousSecret;
  });

  it('authenticates callbacks with the shared secret and is disabled without one', () => {
    assert.equal(isDeliveryReportEndpointEnabled(), true);
    assert.equal(isAuthorizedDeliveryReport(SECRET), true);
    assert.equal(isAuthorizedDeliveryReport('wrong-secret-0123456789xx'), false);
    assert.equal(isAuthorizedDeliveryReport(undefined), false);
    env.MSG91_WEBHOOK_SECRET = 'short';
    assert.equal(isDeliveryReportEndpointEnabled(), false);
    assert.equal(isAuthorizedDeliveryReport('short'), false);
    env.MSG91_WEBHOOK_SECRET = undefined;
    assert.equal(isDeliveryReportEndpointEnabled(), false);
  });

  it('tracks delivery separately from acceptance, forward-only and idempotent', async () => {
    const { donationId } = await payAndVerify();
    const [accepted] = receiptsFor(donationId);
    assert.equal(accepted.whatsappStatus, 'sent'); // MSG91 accepted the request …
    assert.equal(accepted.whatsappDeliveryStatus ?? null, null); // … delivery unknown
    assert.equal((await getDonationStatus(donationId)).whatsappDeliveryStatus, null);

    const id = accepted.whatsappMessageId as string;
    assert.deepEqual(await processWhatsAppDeliveryReport({ requestId: id, status: 'delivered' }), {
      applied: 1,
      ignored: 0,
    });
    // Duplicate, backwards, and failed-after-delivered reports are no-ops.
    assert.deepEqual(await processWhatsAppDeliveryReport({ requestId: id, status: 'delivered' }), {
      applied: 0,
      ignored: 1,
    });
    await processWhatsAppDeliveryReport({ requestId: id, status: 'sent' });
    await processWhatsAppDeliveryReport({ requestId: id, status: 'failed' });
    assert.equal(receiptsFor(donationId)[0].whatsappDeliveryStatus, 'delivered');

    // Batched payloads are accepted; read supersedes delivered.
    await processWhatsAppDeliveryReport([{ request_id: id, eventName: 'READ' }]);
    const [read] = receiptsFor(donationId);
    assert.equal(read.whatsappDeliveryStatus, 'read');
    assert.equal(read.whatsappStatus, 'sent', 'acceptance status is never rewritten');
    assert.equal((await getDonationStatus(donationId)).whatsappDeliveryStatus, 'read');
  });

  it('records a reported 131049 failure without resending anything', async () => {
    const { donationId } = await payAndVerify();
    const id = receiptsFor(donationId)[0].whatsappMessageId as string;
    const callsBefore = whatsappCalls.length;
    await processWhatsAppDeliveryReport({
      data: { requestId: id, status: 'failed', errorCode: 131049, reason: 'ecosystem engagement' },
    });
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.whatsappDeliveryStatus, 'failed');
    assert.match(String(receipt.whatsappFailureReason), /Meta 131049/);
    assert.equal(whatsappCalls.length, callsBefore);
    assert.equal(donorMail().length, 1);
  });

  it('ignores reports it cannot match or parse', async () => {
    assert.deepEqual(
      await processWhatsAppDeliveryReport([
        { requestId: 'unknown-request', status: 'delivered' },
        { foo: 'bar' },
        'not-an-object',
      ]),
      { applied: 0, ignored: 2 },
    );
  });
});

describe('SMTP failure classification', () => {
  it('treats 5xx recipient rejection as permanent and 4xx as temporary', () => {
    const permanent = evaluateSmtpResult({
      accepted: [],
      rejected: ['donor@example.com'],
      response: '550 5.1.1 user unknown',
    });
    assert.equal(permanent.status, 'failed');
    assert.equal(permanent.permanent, true);
    const temporary = evaluateSmtpResult({
      accepted: [],
      rejected: ['donor@example.com'],
      response: '451 4.3.0 try again later',
    });
    assert.equal(temporary.permanent, false);
  });

  it('marks a thrown RCPT 550 as permanent but keeps auth (535) and network errors retryable', async () => {
    const cases: Array<[Record<string, unknown>, boolean]> = [
      [{ message: 'Mailbox unavailable', responseCode: 550, command: 'RCPT TO' }, true],
      [{ message: 'Invalid login', responseCode: 535, command: 'AUTH PLAIN' }, false],
      [{ message: 'connect ETIMEDOUT', code: 'ETIMEDOUT' }, false],
    ];
    for (const [thrown, expected] of cases) {
      mock.method(getMailer(), 'sendMail', async () => {
        throw Object.assign(new Error(String(thrown.message)), thrown);
      });
      const result = await sendMail({
        to: 'donor@example.com',
        subject: 's',
        html: 'h',
        text: 't',
      });
      assert.equal(result.status, 'failed');
      assert.equal(result.permanent, expected, String(thrown.message));
    }
  });

  it('never auto-resends a permanently rejected donor email; only an admin can', async () => {
    smtpAccepts = false; // 550 by default → permanent
    const { donationId, input } = await payAndVerify();
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.emailStatus, 'failed');
    assert.match(
      String(receipt.emailFailureReason),
      /^\[not retried automatically\] SMTP rejected/,
    );
    const donorAttempts = donorMail().length;
    assert.equal(donorAttempts, 1, 'no in-process retries for a permanent rejection');

    smtpAccepts = true;
    await verifyAndCompletePayment(input); // success-page refresh
    assert.equal(donorMail().length, donorAttempts);

    await assert.rejects(
      () => retryReceiptEmail(donationId),
      (error: unknown) => error instanceof ApiError && error.statusCode === 409,
    );
    assert.equal(await retryReceiptEmail(donationId, { overridePermanent: true }), 'sent');
    assert.equal(donorMail().length, donorAttempts + 1);
    assert.equal(receiptsFor(donationId).length, 1);
  });
});

describe('Independent channels: one email failing never blocks the others', () => {
  it('an organisation email failure does not block the donor email or WhatsApp', async () => {
    smtpRejectOnlyTo = env.ORG_RECEIPT_EMAIL;
    smtpRejectResponse = '451 4.3.0 temporary local problem';
    const { donationId } = await payAndVerify();
    const [receipt] = receiptsFor(donationId);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receipt.orgEmailStatus, 'failed');
    assert.equal(receipt.emailStatus, 'sent');
    assert.equal(receipt.whatsappStatus, 'sent');
    assert.equal(receipt.smsStatus, 'sent');
  });

  it('a donor email failure does not block the organisation email or WhatsApp', async () => {
    smtpRejectOnlyTo = 'ravi.kumar@example.com';
    const { donationId } = await payAndVerify();
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.emailStatus, 'failed');
    assert.equal(receipt.orgEmailStatus, 'sent');
    assert.equal(receipt.whatsappStatus, 'sent');
    const org = sentMail.find((mail) => mail.to === env.ORG_RECEIPT_EMAIL);
    assert.ok(org, 'organisation report was sent');
    assert.ok(org.text.includes(receipt.receiptNumber as string));
    assert.equal(org.attachments?.[0].content.subarray(0, 5).toString('latin1'), '%PDF-');
  });
});

describe('Durable delivery retries (database-backed worker)', () => {
  const later = (ms: number) => new Date(Date.now() + ms);

  it('releases the schedule when every channel succeeded', async () => {
    const { donationId } = await payAndVerify();
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.nextDeliveryRetryAt, null);
    assert.equal(receipt.deliveryRetryCount, 0);
  });

  it('persists a transient failure for the worker, which then sends once and clears it', async () => {
    whatsappOk = false;
    whatsappFailHttp = 503;
    const { donationId } = await payAndVerify();
    const [scheduled] = receiptsFor(donationId);
    assert.equal(scheduled.whatsappStatus, 'failed');
    assert.ok(scheduled.nextDeliveryRetryAt instanceof Date, 'retry is stored on the receipt row');

    // Not yet due → nothing happens.
    assert.deepEqual(await runDeliveryRetriesOnce(new Date()), { retried: 0, recovered: 0 });

    whatsappOk = true;
    const callsBefore = whatsappCalls.length;
    const mailBefore = sentMail.length;
    // Two workers (e.g. two API instances) racing for the same due retry.
    const [a, b] = await Promise.all([
      runDeliveryRetriesOnce(later(10 * 60_000)),
      runDeliveryRetriesOnce(later(10 * 60_000)),
    ]);
    assert.equal(a.retried + b.retried, 1, 'exactly one instance claims the retry');
    assert.equal(whatsappCalls.length, callsBefore + 1);
    assert.equal(sentMail.length, mailBefore, 'already-sent emails are not re-sent');

    const [done] = receiptsFor(donationId);
    assert.equal(done.whatsappStatus, 'sent');
    assert.equal(done.nextDeliveryRetryAt, null);
    assert.equal(done.deliveryRetryCount, 1);
    assert.deepEqual(await runDeliveryRetriesOnce(later(24 * 3_600_000)), {
      retried: 0,
      recovered: 0,
    });
  });

  it('stops after a bounded number of attempts', async () => {
    whatsappOk = false;
    whatsappFailHttp = 503;
    const { donationId } = await payAndVerify();
    for (let i = 0; i < RETRY_BACKOFF_MS.length + 3; i += 1) {
      await runDeliveryRetriesOnce(later(48 * 3_600_000));
    }
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.deliveryRetryCount, RETRY_BACKOFF_MS.length);
    assert.equal(receipt.nextDeliveryRetryAt, null);
    assert.equal(receipt.whatsappStatus, 'failed');
    // 3 in-process attempts on each of the 1 + N runs, then it stops for good.
    assert.equal(whatsappCalls.length, 3 * (RETRY_BACKOFF_MS.length + 1));
  });

  it('never schedules a permanent rejection or a configuration gap', async () => {
    whatsappOk = false;
    whatsappFailHttp = 400; // permanent
    const permanent = await payAndVerify();
    assert.equal(receiptsFor(permanent.donationId)[0].nextDeliveryRetryAt, null);

    whatsappOk = true;
    const previous = env.MSG91_WHATSAPP_TEMPLATE_APPROVED;
    env.MSG91_WHATSAPP_TEMPLATE_APPROVED = undefined; // not_configured
    try {
      const unconfigured = await payAndVerify();
      const [receipt] = receiptsFor(unconfigured.donationId);
      assert.equal(receipt.whatsappStatus, 'not_configured');
      assert.equal(receipt.nextDeliveryRetryAt, null);
    } finally {
      env.MSG91_WHATSAPP_TEMPLATE_APPROVED = previous;
    }
  });

  it('re-drives a channel left pending by a crash, using the persisted lease', async () => {
    const { donationId } = await payAndVerify();
    const receipt = receiptsFor(donationId)[0];
    // Simulate a crash mid-send: channel stuck pending, lease still on the row.
    db.receipts.set(receipt.id as string, {
      ...receipt,
      emailStatus: 'pending',
      nextDeliveryRetryAt: new Date(Date.now() - 1_000),
    });
    const before = donorMail().length;
    assert.equal((await runDeliveryRetriesOnce(new Date())).retried, 1);
    assert.equal(receiptsFor(donationId)[0].emailStatus, 'sent');
    assert.equal(donorMail().length, before + 1);
  });

  it('issues the missing receipt for a completed donation that never got one', async () => {
    const { donationId } = seedPendingDonation();
    const row = db.donations.get(donationId) as Record<string, unknown>;
    db.donations.set(donationId, {
      ...row,
      status: 'completed',
      completedAt: new Date(),
      paymentGatewayRef: 'pay_recovered',
    });
    assert.equal(receiptsFor(donationId).length, 0);
    const result = await runDeliveryRetriesOnce(new Date());
    assert.equal(result.recovered, 1);
    assert.equal(receiptsFor(donationId).length, 1);
    assert.equal(receiptsFor(donationId)[0].emailStatus, 'sent');
    // Running again does not create another receipt.
    await runDeliveryRetriesOnce(new Date());
    assert.equal(receiptsFor(donationId).length, 1);
  });

  it('dry-run never schedules retries', async () => {
    const previous = env.NOTIFICATIONS_MODE;
    env.NOTIFICATIONS_MODE = 'dry_run';
    try {
      const { donationId } = await payAndVerify();
      assert.equal(receiptsFor(donationId)[0].nextDeliveryRetryAt, null);
      assert.equal(whatsappCalls.length, 0);
      assert.equal(sentMail.length, 0);
    } finally {
      env.NOTIFICATIONS_MODE = previous;
    }
  });
});

describe('Admin resend authorization', () => {
  type FakeReq = Parameters<typeof adminIdFromRequest>[0];
  const req = (headers: Record<string, string> = {}, cookies: Record<string, string> = {}) =>
    ({
      headers,
      cookies,
      get: (name: string) => headers[name.toLowerCase()],
    }) as unknown as FakeReq;

  it('recognises only a valid admin session, never a donor token or forged JWT', () => {
    const adminToken = signAccessToken({
      sub: 'admin-1',
      sid: 'session-1',
      role: 'admin',
      type: 'admin',
    });
    assert.equal(
      adminIdFromRequest(req({ authorization: `Bearer ${adminToken}` }), undefined),
      'admin-1',
    );
    assert.equal(
      adminIdFromRequest(req({}, { [ACCESS_TOKEN_COOKIE]: adminToken }), undefined),
      'admin-1',
    );
    assert.equal(adminIdFromRequest(req(), adminToken), 'admin-1');
    assert.equal(adminIdFromRequest(req(), undefined), null);
    assert.equal(adminIdFromRequest(req({ authorization: 'Bearer not-a-jwt' }), undefined), null);
    const forged = jwt.sign(
      { sub: 'admin-1', type: 'admin' },
      'wrong-secret-wrong-secret-wrong-secret',
    );
    assert.equal(adminIdFromRequest(req({ authorization: `Bearer ${forged}` }), undefined), null);
  });

  it('an admin override resend keeps the same receipt and never touches the payment', async () => {
    smtpAccepts = false; // 550 → permanent
    const { donationId } = await payAndVerify({ amount: 777 });
    const before = { ...receiptsFor(donationId)[0] };
    const payment = { ...db.donations.get(donationId) };
    smtpAccepts = true;
    assert.equal(await retryReceiptEmail(donationId, { overridePermanent: true }), 'sent');
    const after = receiptsFor(donationId);
    assert.equal(after.length, 1);
    assert.equal(after[0].receiptNumber, before.receiptNumber);
    assert.equal(String(db.donations.get(donationId)?.amount), String(payment.amount));
    assert.equal(db.donations.get(donationId)?.paymentGatewayRef, payment.paymentGatewayRef);
  });
});

describe('Receipt numbering', () => {
  it('issues sequential numbers and retries when a concurrent payment took the same number', async () => {
    const first = await payAndVerify();
    const firstNumber = receiptsFor(first.donationId)[0].receiptNumber as string;

    // Simulate the race: the next lookup sees the state from before `first`
    // committed, so it proposes a number that is already taken.
    const findFirst = fakePrisma.receipt.findFirst;
    let stale = true;
    mock.method(fakePrisma.receipt, 'findFirst', async (args: Parameters<typeof findFirst>[0]) => {
      if (stale) {
        stale = false;
        return null;
      }
      return findFirst(args);
    });

    const second = await payAndVerify();
    const [secondReceipt] = receiptsFor(second.donationId);
    const firstSeq = Number(firstNumber.slice(-6));
    assert.equal(Number((secondReceipt.receiptNumber as string).slice(-6)), firstSeq + 1);
    assert.equal(secondReceipt.emailStatus, 'sent');
  });
});

describe('Website receipt data matches the PDF and email', () => {
  it('returns the same receipt details the PDF prints, with contact details masked', async () => {
    const { donationId, paymentId } = await payAndVerify({ amount: 2500 });
    const status = await getDonationStatus(donationId);
    const [receipt] = receiptsFor(donationId);
    const pdfLines = extractPdfText(donorMail()[0].attachments?.[0].content as Buffer);

    assert.equal(status.status, 'completed');
    assert.equal(status.organisationName, 'Sai Yadadri Seva Ashram');
    assert.ok(pdfLines.includes(status.organisationName));
    assert.equal(status.receiptNumber, receipt.receiptNumber);
    assert.ok(pdfLines.includes(status.receiptNumber as string));
    assert.equal(status.donorName, 'Ravi Kumar');
    assert.equal(status.category, 'Annadanam');
    assert.equal(status.amount, 2500);
    assert.equal(status.paymentReference, paymentId);
    assert.ok(pdfLines.includes(paymentId));
    assert.equal(status.paymentMethod, 'upi');
    assert.ok(status.donationDate instanceof Date);
    // Masked on the web (reachable by link); the full values never leave in this payload.
    assert.equal(status.donorEmailMasked, 'r***@example.com');
    assert.match(status.donorPhoneMasked as string, /^\*+3210$/);
    const body = JSON.stringify(status);
    assert.ok(!body.includes('ravi.kumar@example.com'));
    assert.ok(!body.includes('9876543210'));
  });

  it('handles a donor with no email: no invented contact details anywhere', async () => {
    const { donationId } = await payAndVerify({ email: null });
    const status = await getDonationStatus(donationId);
    assert.equal(status.donorEmailMasked, null);
    assert.equal(status.emailOnFile, false);
    assert.equal(donorMail().length, 0);
    // The organisation still gets its copy, with the PDF.
    const orgCopies = sentMail.filter((mail) => mail.to === env.ORG_RECEIPT_EMAIL);
    assert.equal(orgCopies.length, 1);
    assert.ok(orgCopies[0].text.includes('Donor Email: Not provided'));
    const pdfLines = extractPdfText(orgCopies[0].attachments?.[0].content as Buffer);
    assert.ok(!pdfLines.includes('Email'));
  });

  it('sends the donor email only to the donor’s registered address, independent of the organisation email', async () => {
    smtpAccepts = true;
    smtpRejectOnlyTo = env.ORG_RECEIPT_EMAIL;
    const { donationId } = await payAndVerify();
    const [receipt] = receiptsFor(donationId);
    assert.deepEqual(
      donorMail().map((mail) => mail.to),
      ['ravi.kumar@example.com'],
    );
    assert.equal(receipt.emailStatus, 'sent');
    assert.equal(receipt.orgEmailStatus, 'failed');
    assert.equal(db.donations.get(donationId)?.status, 'completed');
  });
});

describe('Receipts only for completed payments', () => {
  it('never issues a receipt, PDF or notification for a donation that is not completed', async () => {
    const { donationId } = seedPendingDonation();
    await issueReceipt(donationId);
    assert.equal(receiptsFor(donationId).length, 0);
    assert.equal(sentMail.length, 0);
    assert.equal(whatsappCalls.length, 0);
    assert.equal(smsCalls, 0);
  });

  it('refuses to resend a receipt once the donation is no longer completed (e.g. refunded)', async () => {
    smtpAccepts = false;
    smtpRejectResponse = '451 4.3.0 temporary local problem';
    const { donationId } = await payAndVerify();
    const [before] = receiptsFor(donationId);
    const donation = db.donations.get(donationId);
    if (donation) donation.status = 'refunded';
    smtpAccepts = true;
    const attempts = sentMail.length;

    await assert.rejects(
      () => retryReceiptEmail(donationId, { overridePermanent: true }),
      (error: unknown) => error instanceof ApiError && error.statusCode === 409,
    );
    await assert.rejects(() => retryFailedDeliveries(donationId), ApiError);
    await issueReceipt(donationId, { retryPending: true });
    assert.equal(sentMail.length, attempts);
    assert.equal(receiptsFor(donationId).length, 1);
    assert.equal(receiptsFor(donationId)[0].receiptNumber, before.receiptNumber);
  });
});

interface RouteResponse {
  status: number;
  headers: Record<string, string>;
  body?: Buffer;
  error?: unknown;
}

/** Runs GET /:id/receipt/pdf's own handlers in-process (validation, access
 * check, render) — tests have no network, so no HTTP server is started. The
 * rate limiter in front of them is skipped. */
async function getReceiptPdf(donationId: string, token?: string): Promise<RouteResponse> {
  const layer = (
    donationCheckoutRouter.stack as Array<{
      route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{ handle: Function }>;
      };
    }>
  ).find((entry) => entry.route?.path === '/:id/receipt/pdf' && entry.route.methods.get);
  assert.ok(layer?.route, 'GET /:id/receipt/pdf is registered');
  const handlers = layer.route.stack.map((entry) => entry.handle).slice(1);

  return new Promise((resolve) => {
    const response: RouteResponse = { status: 200, headers: {} };
    const req = {
      params: { id: donationId },
      query: token ? { token } : {},
      headers: {},
      cookies: {},
    };
    const res = {
      setHeader: (name: string, value: string) => {
        response.headers[name.toLowerCase()] = value;
      },
      status(code: number) {
        response.status = code;
        return res;
      },
      end(body: Buffer) {
        response.body = body;
        resolve(response);
      },
    };
    const run = (index: number) => (error?: unknown) => {
      if (error) {
        response.error = error;
        response.status = error instanceof ApiError ? error.statusCode : 500;
        resolve(response);
        return;
      }
      const handler = handlers[index];
      if (!handler) return;
      void Promise.resolve(handler(req, res, run(index + 1))).catch(run(index + 1));
    };
    run(0)();
  });
}

describe('Receipt PDF download endpoint', () => {
  it('returns a valid PDF named after the receipt, rendered from the existing record without changing it', async () => {
    const { donationId, paymentId } = await payAndVerify({ amount: 2500 });
    const [before] = receiptsFor(donationId);
    const snapshot = { ...before };
    const mailBefore = sentMail.length;
    const whatsappBefore = whatsappCalls.length;

    const response = await getReceiptPdf(donationId, signDonationAccessToken(donationId));
    assert.equal(response.error, undefined);
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'application/pdf');
    assert.equal(
      response.headers['content-disposition'],
      `attachment; filename="${before.receiptNumber as string}.pdf"`,
    );
    assert.equal(response.headers['cache-control'], 'private, no-store');
    const pdf = response.body as Buffer;
    assert.equal(response.headers['content-length'], String(pdf.length));
    assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
    assert.match(pdf.subarray(-8).toString('latin1'), /%%EOF\s*$/);

    const lines = extractPdfText(pdf);
    for (const expected of [
      'DONATION RECEIPT',
      'Sai Yadadri Seva Ashram',
      before.receiptNumber as string,
      'Ravi Kumar',
      '******3210',
      'ravi.kumar@example.com',
      'Annadanam',
      'INR 2,500',
      'Paid Successfully',
      'UPI',
      paymentId,
    ]) {
      assert.ok(lines.includes(expected), `downloaded PDF is missing "${expected}"`);
    }

    // Read-only: same single receipt, nothing re-sent, no state changed.
    const after = receiptsFor(donationId);
    assert.equal(after.length, 1);
    assert.deepEqual(after[0], snapshot);
    assert.equal(sentMail.length, mailBefore);
    assert.equal(whatsappCalls.length, whatsappBefore);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
  });

  it('refuses without a valid access token', async () => {
    const { donationId } = await payAndVerify();
    assert.equal((await getReceiptPdf(donationId)).status, 401);
    assert.equal((await getReceiptPdf(donationId, 'not-a-valid-token')).status, 401);
  });

  it('refuses a donation that is not completed, and never creates a receipt for it', async () => {
    const { donationId } = seedPendingDonation();
    const pending = await getReceiptPdf(donationId, signDonationAccessToken(donationId));
    assert.equal(pending.status, 404);
    assert.equal(receiptsFor(donationId).length, 0);

    const paid = await payAndVerify();
    const donation = db.donations.get(paid.donationId);
    if (donation) donation.status = 'refunded';
    const refunded = await getReceiptPdf(paid.donationId, signDonationAccessToken(paid.donationId));
    assert.equal(refunded.status, 409);
  });
});

describe('Receipt download links in emails', () => {
  const donationId = '1ae27aed-5b70-41b7-8960-a97866144bf3';

  function tokenOf(link: string): string {
    return new URL(link).searchParams.get('token') as string;
  }

  it('builds a local-development link on the configured API origin', () => {
    const link = buildReceiptDownloadUrl(donationId, {
      apiUrl: 'http://localhost:8081',
      nodeEnv: 'development',
    }) as string;
    assert.ok(
      link.startsWith(`http://localhost:8081/api/v1/donations/${donationId}/receipt/pdf?token=`),
    );
    assert.ok(verifyReceiptAccessToken(donationId, tokenOf(link)));
  });

  it('builds a production link on the public origin, never localhost', () => {
    const link = buildReceiptDownloadUrl(donationId, {
      apiUrl: 'https://sysa.in',
      nodeEnv: 'production',
    }) as string;
    const url = new URL(link);
    assert.equal(url.origin, 'https://sysa.in');
    assert.equal(url.pathname, `/api/v1/donations/${donationId}/receipt/pdf`);
    assert.ok(verifyReceiptAccessToken(donationId, tokenOf(link)));
    // A trailing slash or a sub-path on API_URL is respected, not doubled.
    assert.ok(
      (
        buildReceiptDownloadUrl(donationId, {
          apiUrl: 'https://sysa.in/',
          nodeEnv: 'production',
        }) as string
      ).startsWith('https://sysa.in/api/v1/donations/'),
    );
    assert.ok(
      (
        buildReceiptDownloadUrl(donationId, {
          apiUrl: 'https://example.org/sysa',
          nodeEnv: 'production',
        }) as string
      ).startsWith('https://example.org/sysa/api/v1/donations/'),
    );
  });

  it('omits the link in production when API_URL is localhost or not https', () => {
    for (const apiUrl of [
      'http://localhost:4000',
      'https://127.0.0.1',
      'http://sysa.in',
      'not a url',
    ]) {
      assert.equal(
        buildReceiptDownloadUrl(donationId, { apiUrl, nodeEnv: 'production' }),
        null,
        apiUrl,
      );
    }
  });

  it('URL-encodes the id and token', () => {
    const odd = 'id with/slash?&=#';
    const link = buildReceiptDownloadUrl(odd, {
      apiUrl: 'https://sysa.in',
      nodeEnv: 'production',
    }) as string;
    assert.ok(link.includes(`/donations/${encodeURIComponent(odd)}/receipt/pdf?token=`));
    assert.ok(verifyReceiptAccessToken(odd, tokenOf(link)), 'token survives the round trip');
  });

  it('donor and organisation emails link to the authenticated PDF endpoint, which accepts the link', async () => {
    const { donationId: id } = await payAndVerify();
    const [receipt] = receiptsFor(id);
    const donor = donorMail()[0];
    const org = sentMail.find((mail) => mail.to === env.ORG_RECEIPT_EMAIL) as SentMail & {
      html?: string;
    };

    for (const mail of [donor, org] as Array<SentMail & { html?: string }>) {
      const link = mail.text.match(/https?:\/\/\S+\/receipt\/pdf\?token=\S+/)?.[0];
      assert.ok(link, `${mail.to} email has a download link`);
      assert.ok(link.includes(`/api/v1/donations/${id}/receipt/pdf?token=`));
      assert.ok(!mail.text.includes('cloudinary'));
      assert.ok(
        mail.html?.includes(`href="${link.replace(/&/g, '&amp;')}"`) ||
          mail.html?.includes(`href="${link}"`),
      );
      // The PDF attachment is unchanged.
      assert.equal(mail.attachments?.[0].filename, `${receipt.receiptNumber as string}.pdf`);

      // The link's own token passes the endpoint's existing access check.
      const response = await getReceiptPdf(id, tokenOf(link));
      assert.equal(response.status, 200);
      assert.equal(response.headers['content-type'], 'application/pdf');
    }
    // No extra receipt or send came from building the links.
    assert.equal(receiptsFor(id).length, 1);
    assert.equal(donorMail().length, 1);
  });

  it('a receipt token for one donation does not open another donation’s receipt', async () => {
    const first = await payAndVerify();
    const second = await payAndVerify();
    const link = buildReceiptDownloadUrl(first.donationId) as string;
    assert.equal((await getReceiptPdf(second.donationId, tokenOf(link))).status, 401);
  });

  it('never writes the access token to application logs', async () => {
    const { donationId: id } = await payAndVerify();
    const link = buildReceiptDownloadUrl(id) as string;
    const token = tokenOf(link);
    const capture = captureLogs();
    try {
      // What the request logger records for a failed download through the link.
      const listeners: Array<() => void> = [];
      const req = {
        method: 'GET',
        originalUrl: new URL(link).pathname + new URL(link).search,
        ip: '127.0.0.1',
      };
      const res = { statusCode: 401, on: (_event: string, fn: () => void) => listeners.push(fn) };
      requestLogger(req as never, res as never, () => undefined);
      listeners.forEach((fn) => fn());
      logger.warn(`Route not found: GET ${link}`);
    } finally {
      capture.stop();
    }
    const logged = capture.lines.join('\n');
    assert.ok(logged.includes('/receipt/pdf?token=[REDACTED]'), 'the path is still logged');
    assert.ok(!logged.includes(token), 'the token is never logged');
  });
});

describe('Access tokens are not interchangeable', () => {
  it('a donor login or receipt link is never accepted as an admin token', async () => {
    const owner = await payAndVerify();
    const other = await payAndVerify();
    const ownerDonorId = db.donations.get(owner.donationId)?.donorId as string;
    const donorSession = signDonorToken(ownerDonorId);
    const receiptLink = signReceiptAccessToken(owner.donationId);

    for (const token of [donorSession, receiptLink]) {
      assert.throws(() => verifyAccessToken(token));
      // Neither opens a donation that is not theirs …
      assert.equal((await getReceiptPdf(other.donationId, token)).status, 401);
    }
    // … while each still opens its own.
    assert.equal((await getReceiptPdf(owner.donationId, receiptLink)).status, 200);
    assert.equal((await getReceiptPdf(owner.donationId, donorSession)).status, 200);
    // A real admin token still works for any donation.
    const adminToken = signAccessToken({
      sub: 'admin-1',
      sid: 'session-1',
      role: 'admin',
      type: 'admin',
    });
    assert.equal(verifyAccessToken(adminToken).sub, 'admin-1');
    assert.equal((await getReceiptPdf(other.donationId, adminToken)).status, 200);
  });
});

/** Runs any donation route's own handlers in-process (rate limiters skipped). */
async function callRoute(
  method: 'get' | 'post',
  path: string,
  params: Record<string, string>,
  token?: string,
): Promise<{ status: number; body?: unknown }> {
  const layer = (
    donationCheckoutRouter.stack as Array<{
      route?: {
        path: string;
        methods: Record<string, boolean>;
        stack: Array<{ handle: Function }>;
      };
    }>
  ).find((entry) => entry.route?.path === path && entry.route.methods[method]);
  assert.ok(layer?.route, `${method.toUpperCase()} ${path} is registered`);
  const handlers = layer.route.stack
    .map((entry) => entry.handle)
    .filter((handle) => !('resetKey' in handle)); // express-rate-limit middleware

  return new Promise((resolve) => {
    const out: { status: number; body?: unknown } = { status: 200 };
    const req = { params, query: token ? { token } : {}, headers: {}, cookies: {}, body: {} };
    const res = {
      setHeader: () => undefined,
      status(code: number) {
        out.status = code;
        return res;
      },
      json(body: unknown) {
        out.body = body;
        resolve(out);
      },
      end(body: unknown) {
        out.body = body;
        resolve(out);
      },
    };
    const run = (index: number) => (error?: unknown) => {
      if (error) {
        out.status = error instanceof ApiError ? error.statusCode : 500;
        resolve(out);
        return;
      }
      const handler = handlers[index];
      if (handler) void Promise.resolve(handler(req, res, run(index + 1))).catch(run(index + 1));
    };
    run(0)();
  });
}

const DONATION_ROUTES: Array<['get' | 'post', string]> = [
  ['get', '/:id/status'],
  ['get', '/:id/receipt'],
  ['get', '/:id/receipt/pdf'],
  ['post', '/:id/retry-email'],
  ['post', '/:id/retry-whatsapp'],
  ['post', '/:id/retry-sms'],
  ['post', '/:id/retry-deliveries'],
];

describe('Receipt and donation tokens are scoped to their own donation', () => {
  it('no token for one donor opens another donor status, receipt, PDF or resend action', async () => {
    const mine = await payAndVerify();
    const theirs = await payAndVerify({ email: 'someone.else@example.com', phone: '9123456780' });
    const mineDonor = db.donations.get(mine.donationId)?.donorId as string;
    const sendsBefore = sentMail.length + whatsappCalls.length + smsCalls;

    for (const token of [
      signDonationAccessToken(mine.donationId),
      signReceiptAccessToken(mine.donationId),
      signDonorToken(mineDonor),
    ]) {
      for (const [method, path] of DONATION_ROUTES) {
        const response = await callRoute(method, path, { id: theirs.donationId }, token);
        assert.equal(
          response.status,
          401,
          `${method.toUpperCase()} ${path} must refuse another donor token`,
        );
      }
      const cancel = await callRoute(
        'post',
        '/subscriptions/:id/cancel',
        { id: theirs.donationId },
        token,
      );
      assert.notEqual(cancel.status, 200);
    }
    assert.equal(
      sentMail.length + whatsappCalls.length + smsCalls,
      sendsBefore,
      'nothing was resent',
    );

    // The same tokens still work for their own donation (read-only routes).
    for (const token of [
      signDonationAccessToken(mine.donationId),
      signReceiptAccessToken(mine.donationId),
    ]) {
      for (const path of ['/:id/status', '/:id/receipt', '/:id/receipt/pdf']) {
        assert.equal(
          (await callRoute('get', path, { id: mine.donationId }, token)).status,
          200,
          path,
        );
      }
    }
  });
});

describe('Donation token lifecycle and revocation', () => {
  const id = '6f1c2c1e-0000-4000-8000-000000000001';
  const legacyToken = () => createHmac('sha256', env.JWT_ACCESS_SECRET).update(id).digest('hex');
  const saved = {
    secret: env.DONATION_TOKEN_SECRET,
    ttl: env.DONATION_TOKEN_TTL_DAYS,
    after: env.DONATION_TOKENS_ISSUED_AFTER,
    legacy: env.DONATION_TOKEN_LEGACY_UNTIL,
  };
  afterEach(() => {
    env.DONATION_TOKEN_SECRET = saved.secret;
    env.DONATION_TOKEN_TTL_DAYS = saved.ttl;
    env.DONATION_TOKENS_ISSUED_AFTER = saved.after;
    env.DONATION_TOKEN_LEGACY_UNTIL = saved.legacy;
  });

  it('issues versioned tokens that expire after the configured lifetime', () => {
    const issued = new Date('2026-10-15T00:00:00Z');
    const token = signDonationAccessToken(id, issued);
    assert.match(token, /^v2\.\d+\.[0-9a-f]{64}$/);
    assert.ok(verifyDonationAccessToken(id, token, new Date('2026-11-13T00:00:00Z')));
    assert.ok(
      !verifyDonationAccessToken(id, token, new Date('2026-11-15T00:00:01Z')),
      'expired after 30 days',
    );
    assert.ok(
      !verifyDonationAccessToken(id, token, new Date('2026-10-14T00:00:00Z')),
      'not valid before issue',
    );
  });

  it('rejects tampered, re-dated or cross-donation tokens', () => {
    const now = new Date();
    const token = signDonationAccessToken(id, now);
    const [version, issuedAt, mac] = token.split('.');
    const flipped = mac.slice(0, -1) + (mac.endsWith('0') ? '1' : '0');
    assert.ok(!verifyDonationAccessToken('another-donation', token, now));
    assert.ok(
      !verifyDonationAccessToken(id, `${version}.${Number(issuedAt) + 86_400}.${mac}`, now),
    );
    assert.ok(!verifyDonationAccessToken(id, `${version}.${issuedAt}.${flipped}`, now));
    assert.ok(!verifyDonationAccessToken(id, `v3.${issuedAt}.${mac}`, now));
    assert.ok(!verifyDonationAccessToken(id, '', now));
  });

  it('honours pre-v2 (non-expiring) tokens only until the legacy sunset date', () => {
    env.DONATION_TOKEN_LEGACY_UNTIL = new Date('2026-11-15T00:00:00Z');
    assert.ok(verifyDonationAccessToken(id, legacyToken(), new Date('2026-11-14T23:59:59Z')));
    assert.ok(!verifyDonationAccessToken(id, legacyToken(), new Date('2026-11-15T00:00:00Z')));
    assert.ok(
      !verifyDonationAccessToken(
        'another-donation',
        legacyToken(),
        new Date('2026-10-15T00:00:00Z'),
      ),
    );
  });

  it('DONATION_TOKENS_ISSUED_AFTER revokes every earlier donation link, legacy token and emailed receipt link', () => {
    const before = new Date(Date.now() - 60_000);
    const oldToken = signDonationAccessToken(id, before);
    const oldReceiptLink = signReceiptAccessToken(id);
    assert.ok(verifyDonationAccessToken(id, oldToken));
    assert.ok(verifyReceiptAccessToken(id, oldReceiptLink));

    env.DONATION_TOKENS_ISSUED_AFTER = new Date(Date.now() + 1_000);
    assert.ok(!verifyDonationAccessToken(id, oldToken));
    assert.ok(!verifyDonationAccessToken(id, legacyToken()));
    assert.ok(!verifyReceiptAccessToken(id, oldReceiptLink));
    // Links issued after the cutoff work normally.
    const later = new Date(Date.now() + 2_000);
    assert.ok(verifyDonationAccessToken(id, signDonationAccessToken(id, later), later));
  });

  it('rotating DONATION_TOKEN_SECRET revokes every v2 donation link', () => {
    env.DONATION_TOKEN_SECRET = 'a'.repeat(40);
    const token = signDonationAccessToken(id);
    assert.ok(verifyDonationAccessToken(id, token));
    env.DONATION_TOKEN_SECRET = 'b'.repeat(40);
    assert.ok(!verifyDonationAccessToken(id, token));
  });
});

describe('Receipt page endpoints with expired or revoked links', () => {
  const savedCutoff = env.DONATION_TOKENS_ISSUED_AFTER;
  afterEach(() => {
    env.DONATION_TOKENS_ISSUED_AFTER = savedCutoff;
  });

  it('a valid, current link returns the receipt and a real PDF named after it', async () => {
    const { donationId } = await payAndVerify();
    const token = signDonationAccessToken(donationId);
    const view = await callRoute('get', '/:id/receipt', { id: donationId }, token);
    assert.equal(view.status, 200);
    const pdf = await getReceiptPdf(donationId, token);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers['content-type'], 'application/pdf');
    assert.match(
      pdf.headers['content-disposition'],
      /^attachment; filename="RCPT-\d{4}-\d{6}\.pdf"$/,
    );
  });

  it('an expired link gets 401 (not 404 or a hang) on the receipt view and PDF', async () => {
    const { donationId } = await payAndVerify();
    const expired = signDonationAccessToken(
      donationId,
      new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
    );
    assert.equal((await callRoute('get', '/:id/receipt', { id: donationId }, expired)).status, 401);
    assert.equal((await getReceiptPdf(donationId, expired)).status, 401);
  });

  it('a link revoked by DONATION_TOKENS_ISSUED_AFTER gets 401; a newly issued one works', async () => {
    const { donationId } = await payAndVerify();
    const old = signDonationAccessToken(donationId, new Date(Date.now() - 60_000));
    env.DONATION_TOKENS_ISSUED_AFTER = new Date(Date.now() - 1_000);
    assert.equal((await callRoute('get', '/:id/receipt', { id: donationId }, old)).status, 401);
    assert.equal((await getReceiptPdf(donationId, old)).status, 401);
    const fresh = signDonationAccessToken(donationId);
    assert.equal((await callRoute('get', '/:id/receipt', { id: donationId }, fresh)).status, 200);
  });

  it('a completed donation whose receipt row is missing gets 404 from the receipt view', async () => {
    const { donationId } = await payAndVerify();
    for (const [key, row] of db.receipts)
      if (row.donationId === donationId) db.receipts.delete(key);
    assert.equal(
      (
        await callRoute(
          'get',
          '/:id/receipt',
          { id: donationId },
          signDonationAccessToken(donationId),
        )
      ).status,
      404,
    );
  });
});

describe('All submitted donor details reach the receipt (with masking)', () => {
  const FULL_PAN = 'ABCDE1234F';
  const FULL_AADHAAR = '123456789012';
  const submission = {
    donorName: 'Ravi Kumar',
    donorPhone: '9876543210',
    donorEmail: 'ravi.kumar@example.com',
    panNumber: FULL_PAN,
    aadhaarNumber: FULL_AADHAAR,
    donorAddress:
      'Flat 402, Sri Sai Residency, Road No. 12, Banjara Hills, near the old water tank and community hall',
    donorCity: 'Hyderabad',
    donorState: 'Telangana',
    donorPincode: '500034',
  };

  async function payWithSubmission(details: Partial<typeof submission>) {
    const { donationId, orderId } = seedPendingDonation();
    // What /donations/initiate does with the submitted form (phone match).
    await resolveDonor({ ...submission, ...details } as typeof submission);
    const paymentId = `pay_${donationId.slice(0, 8)}`;
    await verifyAndCompletePayment({
      donationId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: checkoutSignature(orderId, paymentId),
    });
    return { donationId, paymentId };
  }

  it('saves every field, storing only masked PAN and Aadhaar', async () => {
    const capture = captureLogs();
    let donationId: string;
    try {
      ({ donationId } = await payWithSubmission({}));
    } finally {
      capture.stop();
    }
    const donor = db.donors.get(db.donations.get(donationId)?.donorId as string);
    assert.equal(donor?.name, 'Ravi Kumar');
    assert.equal(donor?.phone, '9876543210');
    assert.equal(donor?.email, 'ravi.kumar@example.com');
    assert.equal(donor?.address, submission.donorAddress);
    assert.equal(donor?.city, 'Hyderabad');
    assert.equal(donor?.state, 'Telangana');
    assert.equal(donor?.pincode, '500034');
    assert.equal(donor?.panNumberMasked, '******234F');
    assert.equal(donor?.aadhaarNumberMasked, '********9012');
    const stored = JSON.stringify([
      ...db.donors.values(),
      ...db.donations.values(),
      ...db.receipts.values(),
    ]);
    assert.ok(
      !stored.includes(FULL_PAN) && !stored.includes(FULL_AADHAAR),
      'full PAN/Aadhaar never stored',
    );
    const logged = capture.lines.join('\n');
    assert.ok(
      !logged.includes(FULL_PAN) && !logged.includes(FULL_AADHAAR),
      'full PAN/Aadhaar never logged',
    );
    assert.ok(!logged.includes('9876543210'), 'full mobile never logged');
  });

  it('shows the same donor details on the website receipt, the PDF and the donor email', async () => {
    const { donationId } = await payWithSubmission({});
    const status = await getDonationStatus(donationId);
    assert.equal(status.donorName, 'Ravi Kumar');
    assert.equal(status.donorPhoneMasked, '******3210');
    assert.equal(status.donorEmailMasked, 'r***@example.com');
    assert.equal(status.donorAddress, submission.donorAddress);
    assert.equal(status.donorCity, 'Hyderabad');
    assert.equal(status.donorState, 'Telangana');
    assert.equal(status.donorPincode, '500034');
    assert.equal(status.panNumberMasked, '******234F');
    const statusJson = JSON.stringify(status);
    assert.ok(!/aadhaar/i.test(statusJson), 'no Aadhaar in the website payload');

    const mail = donorMail()[0];
    const pdfLines = extractPdfText(mail.attachments?.[0].content as Buffer);
    const pdfText = pdfLines.join('\n');
    for (const [label, value] of [
      ['Name', 'Ravi Kumar'],
      ['Mobile Number', '******3210'],
      ['Email', 'ravi.kumar@example.com'],
      ['City', 'Hyderabad'],
      ['State', 'Telangana'],
      ['Pincode', '500034'],
      ['PAN', '******234F'],
    ]) {
      assert.equal(pdfLines[pdfLines.indexOf(label) + 1], value, `PDF ${label}`);
    }
    assert.ok(
      pdfText.replace(/\s+/g, ' ').includes('near the old water tank'),
      'long address printed in full',
    );

    for (const expected of [
      'Mobile Number: ******3210',
      'PAN: ******234F',
      `Address: ${submission.donorAddress}`,
      'City: Hyderabad',
      'State: Telangana',
      'Pincode: 500034',
      'Payment Method: UPI',
    ]) {
      assert.ok(mail.text.includes(expected), `donor email is missing "${expected}"`);
    }

    // Nothing donor-facing carries Aadhaar (even masked), a full PAN or a full mobile.
    for (const [where, text] of [
      ['donor email', `${mail.text}\n${(mail as SentMail & { html?: string }).html ?? ''}`],
      ['PDF', pdfText],
      ['website payload', statusJson],
    ]) {
      assert.ok(!/aadhaar/i.test(text), `${where} mentions Aadhaar`);
      assert.ok(!text.includes(FULL_PAN), `${where} has the full PAN`);
      assert.ok(!text.includes(FULL_AADHAAR), `${where} has the full Aadhaar`);
      assert.ok(!text.includes('9876543210'), `${where} has the full mobile`);
    }
  });

  it('keeps the organisation report complete (internal), with Aadhaar only as XXXX XXXX + last 4', async () => {
    await payWithSubmission({});
    const org = sentMail.find((mail) => mail.to === env.ORG_RECEIPT_EMAIL) as SentMail;
    for (const expected of [
      'Donor Mobile: 9876543210',
      'Donor Email: ravi.kumar@example.com',
      'PAN: ******234F',
      'Aadhaar: XXXX XXXX 9012',
      'Hyderabad',
      'Telangana',
      '500034',
    ]) {
      assert.ok(org.text.includes(expected), `org email is missing "${expected}"`);
    }
    assert.ok(!org.text.includes(FULL_PAN) && !org.text.includes(FULL_AADHAAR));
    // Its attachment is the same donor PDF — no Aadhaar.
    assert.ok(!/aadhaar/i.test(extractPdfText(org.attachments?.[0].content as Buffer).join('\n')));
  });

  it('leaves out optional details that were not submitted, without placeholders', async () => {
    const { donationId } = seedPendingDonation({ email: null });
    const paymentId = `pay_${donationId.slice(0, 8)}`;
    await verifyAndCompletePayment({
      donationId,
      razorpayOrderId: db.donations.get(donationId)?.razorpayOrderId as string,
      razorpayPaymentId: paymentId,
      razorpaySignature: checkoutSignature(
        db.donations.get(donationId)?.razorpayOrderId as string,
        paymentId,
      ),
    });
    const status = await getDonationStatus(donationId);
    for (const field of [
      'donorAddress',
      'donorCity',
      'donorState',
      'donorPincode',
      'panNumberMasked',
      'donorEmailMasked',
    ] as const) {
      assert.equal(status[field], null, field);
    }
    const org = sentMail.find((mail) => mail.to === env.ORG_RECEIPT_EMAIL) as SentMail;
    const pdfLines = extractPdfText(org.attachments?.[0].content as Buffer);
    for (const absent of ['Email', 'Address', 'City', 'State', 'Pincode', 'PAN']) {
      assert.ok(!pdfLines.includes(absent), `PDF should not print ${absent}`);
    }
    assert.doesNotMatch(pdfLines.join('\n'), /null|undefined/);
  });
});

describe('Receipts go to the contact details submitted with the donation', () => {
  async function initiateAndPay(input: {
    donorName?: string;
    donorPhone: string;
    donorEmail?: string;
    whatsappReceiptConsent?: boolean;
  }) {
    mock.method(getRazorpayClient().orders, 'create', async () => ({ id: 'order_pending' }));
    const categoryId = randomUUID();
    db.categories.set(categoryId, { id: categoryId, nameEn: 'Annadanam' });
    const session = await initiateDonation({
      donorName: input.donorName ?? 'Ravi Kumar',
      donorPhone: input.donorPhone,
      donorEmail: input.donorEmail,
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123456789012',
      whatsappReceiptConsent: input.whatsappReceiptConsent,
      categoryId,
      amount: 501,
      idempotencyKey: `idem-${randomUUID()}`,
    });
    const donationId = session.donationId;
    // Match the harness's order/payment naming so verification finds it.
    const orderId = `order_${donationId.slice(0, 8)}`;
    const row = db.donations.get(donationId) as Record<string, unknown>;
    row.razorpayOrderId = orderId;
    const paymentId = `pay_${donationId.slice(0, 8)}`;
    await verifyAndCompletePayment({
      donationId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: checkoutSignature(orderId, paymentId),
    });
    return { donationId, row: db.donations.get(donationId) as Record<string, unknown> };
  }

  it('records the submitted email, normalized mobile and opt-in on the donation', async () => {
    const { row } = await initiateAndPay({
      donorPhone: '+91 98765 43210',
      donorEmail: 'ravi.kumar@example.com',
      whatsappReceiptConsent: true,
    });
    assert.equal(row.receiptEmail, 'ravi.kumar@example.com');
    assert.equal(row.receiptPhone, '9876543210');
    assert.equal(row.whatsappReceiptConsent, true);
  });

  it('opted in: one email to the submitted address and one approved-template WhatsApp to the submitted mobile', async () => {
    const { donationId } = await initiateAndPay({
      donorPhone: '9876500011',
      donorEmail: 'first.donor@example.com',
      whatsappReceiptConsent: true,
    });
    const [receipt] = receiptsFor(donationId);
    const mails = donorMail();
    assert.deepEqual(
      mails.map((m) => m.to),
      ['first.donor@example.com'],
    );
    assert.equal(mails[0].attachments?.[0].filename, `${receipt.receiptNumber as string}.pdf`);

    assert.equal(whatsappCalls.length, 1);
    const call = whatsappCalls[0];
    assert.equal(call.body.integrated_number, '919490118877');
    assert.equal(call.body.payload.template.name, 'sysa_donation_receipt');
    const [recipient] = call.body.payload.template.to_and_components;
    assert.deepEqual(recipient.to, ['919876500011']);
    assert.equal(recipient.components.body_1.value, 'Ravi Kumar');
    assert.equal(recipient.components.body_2.value, '501');
    assert.equal(recipient.components.body_3.value, receipt.receiptNumber);
    // Accepted by MSG91 is recorded as sent - never as delivered.
    assert.equal(receipt.whatsappStatus, 'sent');
    assert.equal((await getDonationStatus(donationId)).whatsappDeliveryStatus, null);
  });

  it('not opted in: no WhatsApp request at all, recorded as not requested', async () => {
    const { donationId } = await initiateAndPay({
      donorPhone: '9876500012',
      donorEmail: 'second.donor@example.com',
      whatsappReceiptConsent: false,
    });
    assert.equal(whatsappCalls.length, 0);
    assert.equal(receiptsFor(donationId)[0].whatsappStatus, 'skipped');
    assert.equal((await getDonationStatus(donationId)).whatsappConsent, false);
  });

  it('sends to the newly entered email even when it could not be saved to the donor record', async () => {
    // Another donor already owns this address; the mobile matches Ravi.
    await resolveDonor({
      donorName: 'Someone Else',
      donorPhone: '9123400000',
      donorEmail: 'shared.family@example.com',
    });
    await resolveDonor({
      donorName: 'Ravi Kumar',
      donorPhone: '9876500013',
      donorEmail: 'old.ravi@example.com',
    });
    const { donationId, row } = await initiateAndPay({
      donorPhone: '9876500013',
      donorEmail: 'shared.family@example.com',
    });
    const donor = db.donors.get(row.donorId as string);
    assert.equal(donor?.email, 'old.ravi@example.com', 'donor record keeps its own email');
    assert.deepEqual(
      donorMail().map((m) => m.to),
      ['shared.family@example.com'],
    );
    assert.ok(!sentMail.some((m) => m.to === 'old.ravi@example.com'));
    assert.equal((await getDonationStatus(donationId)).donorEmailMasked, 's***@example.com');
  });

  it('matched by email to another donor record: never sends that record receipt to the unverified mobile', async () => {
    await resolveDonor({
      donorName: 'Owner',
      donorPhone: '9123400001',
      donorEmail: 'owner@example.com',
    });
    const { donationId } = await initiateAndPay({
      donorName: 'Different Person',
      donorPhone: '9876500014',
      donorEmail: 'owner@example.com',
      whatsappReceiptConsent: true,
    });
    const [receipt] = receiptsFor(donationId);
    assert.equal(whatsappCalls.length, 0);
    assert.equal(smsCalls, 0);
    assert.equal(receipt.whatsappStatus, 'skipped');
    assert.match(receipt.whatsappFailureReason as string, /does not belong to the donor record/);
    // Not even an admin resend sends it there.
    await assert.rejects(
      () => retryReceiptWhatsApp(donationId, { overridePermanent: true }),
      ApiError,
    );
    assert.equal(whatsappCalls.length, 0);
    // The email entered (the matched record's own address) still gets it.
    assert.deepEqual(
      donorMail().map((m) => m.to),
      ['owner@example.com'],
    );
  });

  it('opt-in belongs to each donation: a later unticked donation does not cancel an earlier ticked one', async () => {
    whatsappOk = false;
    whatsappFailHttp = 503; // transient: the first donation's WhatsApp fails
    const first = await initiateAndPay({ donorPhone: '9876500015', whatsappReceiptConsent: true });
    whatsappOk = true;
    const callsAfterFirst = whatsappCalls.length;
    await initiateAndPay({ donorPhone: '9876500015', whatsappReceiptConsent: false });
    assert.equal(whatsappCalls.length, callsAfterFirst, 'second donation sends no WhatsApp');

    assert.equal(await retryReceiptWhatsApp(first.donationId), 'sent');
    assert.equal(whatsappCalls.length, callsAfterFirst + 1);
  });

  it('email and WhatsApp fail independently, and a retry resends only what failed', async () => {
    smtpAccepts = false;
    smtpRejectResponse = '451 4.3.0 temporary local problem';
    const { donationId } = await initiateAndPay({
      donorPhone: '9876500016',
      donorEmail: 'third.donor@example.com',
      whatsappReceiptConsent: true,
    });
    const [before] = receiptsFor(donationId);
    assert.equal(before.emailStatus, 'failed');
    assert.equal(before.whatsappStatus, 'sent');
    const whatsappBefore = whatsappCalls.length;

    smtpAccepts = true;
    const result = await retryFailedDeliveries(donationId);
    assert.equal(result.emailStatus, 'sent');
    assert.equal(whatsappCalls.length, whatsappBefore, 'the successful WhatsApp is not resent');
    assert.equal(receiptsFor(donationId).length, 1);
    assert.equal(receiptsFor(donationId)[0].receiptNumber, before.receiptNumber);

    // Everything sent now: another retry sends nothing at all.
    const emailsBefore = sentMail.length;
    await retryFailedDeliveries(donationId);
    assert.equal(sentMail.length, emailsBefore);
    assert.equal(whatsappCalls.length, whatsappBefore);
  });
});

describe('WhatsApp receipt as a PDF document (document-header template)', () => {
  const DOCUMENT_TEMPLATE_VARS = JSON.stringify({
    header_1: 'document',
    body_1: 'customerName',
    body_2: 'amountFormatted',
    body_3: 'receiptNumber',
  });
  let previousVars: string | undefined;
  let mediaUploads: Array<{ pdf: Buffer; receiptNumber: string }>;

  beforeEach(() => {
    previousVars = env.MSG91_WHATSAPP_TEMPLATE_VARS;
    env.MSG91_WHATSAPP_TEMPLATE_VARS = DOCUMENT_TEMPLATE_VARS;
    mediaUploads = [];
    mock.method(receiptMedia, 'createUrl', async (pdf: Buffer, receiptNumber: string) => {
      assertPdf(pdf);
      mediaUploads.push({ pdf, receiptNumber });
      return `https://media.example.test/private/${receiptNumber}.pdf?signature=SIGNED&expires_at=1`;
    });
  });
  afterEach(() => {
    env.MSG91_WHATSAPP_TEMPLATE_VARS = previousVars;
  });

  it('sends the receipt PDF itself as the WhatsApp document, freshly rendered for that donation', async () => {
    const { donationId, paymentId } = await payAndVerify({ amount: 1 });
    const [receipt] = receiptsFor(donationId);

    // One private upload of THIS donation's freshly rendered receipt PDF.
    assert.equal(mediaUploads.length, 1);
    assert.equal(mediaUploads[0].receiptNumber, receipt.receiptNumber);
    const lines = extractPdfText(mediaUploads[0].pdf);
    for (const expected of [
      receipt.receiptNumber as string,
      'Ravi Kumar',
      'INR 1',
      paymentId,
      'Paid Successfully',
    ]) {
      assert.ok(lines.includes(expected), `WhatsApp PDF is missing "${expected}"`);
    }

    // The WhatsApp message carries that document in its header.
    assert.equal(whatsappCalls.length, 1);
    const [recipient] = whatsappCalls[0].body.payload.template.to_and_components;
    const header = recipient.components.header_1 as unknown as {
      type: string;
      value: string;
      filename: string;
    };
    assert.equal(header.type, 'document');
    assert.equal(
      header.value,
      `https://media.example.test/private/${receipt.receiptNumber as string}.pdf?signature=SIGNED&expires_at=1`,
    );
    assert.equal(header.filename, `${receipt.receiptNumber as string}.pdf`);
    assert.equal(recipient.components.body_3.value, receipt.receiptNumber);
    // The signed link is not persisted anywhere on the receipt.
    assert.ok(!JSON.stringify(receiptsFor(donationId)).includes('signature=SIGNED'));
    // Accepted is recorded as sent, never delivered.
    assert.equal(receipt.whatsappStatus, 'sent');
  });

  it('the email still carries the same receipt PDF attachment', async () => {
    const { donationId } = await payAndVerify();
    const [receipt] = receiptsFor(donationId);
    const attachment = donorMail()[0].attachments?.[0];
    assert.equal(attachment?.filename, `${receipt.receiptNumber as string}.pdf`);
    assert.ok((attachment?.content.length ?? 0) > 1000);
    assert.equal(attachment?.content.subarray(0, 5).toString('latin1'), '%PDF-');
  });

  it('no consent: no document upload and no WhatsApp request', async () => {
    await payAndVerify({ whatsappReceiptConsent: false });
    assert.equal(mediaUploads.length, 0);
    assert.equal(whatsappCalls.length, 0);
  });

  it('unverified or failed payments upload and send nothing', async () => {
    razorpayStatus = 'failed';
    const { donationId, orderId } = seedPendingDonation();
    const paymentId = `pay_${donationId.slice(0, 8)}`;
    await assert.rejects(() =>
      verifyAndCompletePayment({
        donationId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: 'not-a-valid-signature',
      }),
    );
    assert.equal(mediaUploads.length, 0);
    assert.equal(whatsappCalls.length, 0);
    assert.equal(sentMail.length, 0);
    assert.equal(receiptsFor(donationId).length, 0);
  });

  it('webhook redelivery after verify sends no second document or email', async () => {
    const { orderId, paymentId } = await payAndVerify();
    const mailsBefore = sentMail.length;
    const { raw, signature } = webhookRequest(orderId, paymentId);
    await processRazorpayWebhook(raw, signature);
    await processRazorpayWebhook(raw, signature);
    assert.equal(mediaUploads.length, 1);
    assert.equal(whatsappCalls.length, 1);
    assert.equal(sentMail.length, mailsBefore);
  });

  it('a WhatsApp document failure keeps the email receipt and is reported, then a retry sends only WhatsApp', async () => {
    whatsappOk = false;
    whatsappFailHttp = 503;
    const { donationId } = await payAndVerify();
    const [failed] = receiptsFor(donationId);
    assert.equal(failed.emailStatus, 'sent');
    assert.equal(failed.whatsappStatus, 'failed');
    const emailsBefore = donorMail().length;

    whatsappOk = true;
    assert.equal(await retryReceiptWhatsApp(donationId), 'sent');
    assert.equal(donorMail().length, emailsBefore, 'email not resent');
    const [after] = receiptsFor(donationId);
    assert.equal(after.receiptNumber, failed.receiptNumber);
    // The retry rendered and uploaded the same receipt again (fresh link).
    assert.equal(mediaUploads.at(-1)?.receiptNumber, failed.receiptNumber);
  });

  it('a document that cannot be prepared fails WhatsApp only, with a clear reason', async () => {
    mock.method(receiptMedia, 'createUrl', async () => {
      throw new Error('upload failed');
    });
    const { donationId } = await payAndVerify();
    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.emailStatus, 'sent');
    assert.equal(receipt.whatsappStatus, 'failed');
    assert.match(
      String(receipt.whatsappFailureReason),
      /Receipt document could not be prepared for WhatsApp: upload failed/,
    );
    assert.equal(whatsappCalls.length, 0);
  });

  it('sysa_donation_receipt_pdf (no VARS override): exact MSG91 document-header request to the donation phone', async () => {
    const previousName = env.MSG91_WHATSAPP_TEMPLATE_NAME;
    const previousId = env.MSG91_WHATSAPP_TEMPLATE_ID;
    env.MSG91_WHATSAPP_TEMPLATE_VARS = undefined; // built-in map for this template
    env.MSG91_WHATSAPP_TEMPLATE_NAME = 'sysa_donation_receipt_pdf';
    env.MSG91_WHATSAPP_TEMPLATE_ID = '571129';
    try {
      const { donationId } = await payAndVerify({ amount: 1500, phone: '+91 98765 43210' });
      const [receipt] = receiptsFor(donationId);
      const receiptNumber = receipt.receiptNumber as string;
      assert.equal(mediaUploads.length, 1);
      assert.equal(whatsappCalls.length, 1);
      assert.deepEqual(whatsappCalls[0].body, {
        integrated_number: '919490118877',
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: 'sysa_donation_receipt_pdf',
            language: { code: 'en', policy: 'deterministic' },
            namespace: 'test_namespace',
            to_and_components: [
              {
                to: ['919876543210'],
                components: {
                  header_1: {
                    type: 'document',
                    value: `https://media.example.test/private/${receiptNumber}.pdf?signature=SIGNED&expires_at=1`,
                    filename: `${receiptNumber}.pdf`,
                  },
                  body_1: { type: 'text', value: 'Ravi Kumar' },
                  body_2: { type: 'text', value: '1,500' },
                  body_3: { type: 'text', value: receiptNumber },
                },
              },
            ],
          },
        },
      });
    } finally {
      env.MSG91_WHATSAPP_TEMPLATE_NAME = previousName;
      env.MSG91_WHATSAPP_TEMPLATE_ID = previousId;
    }
  });

  it('text-only template (today): no document upload at all', async () => {
    env.MSG91_WHATSAPP_TEMPLATE_VARS = previousVars;
    await payAndVerify();
    assert.equal(mediaUploads.length, 0);
    assert.equal(whatsappCalls.length, 1);
    const [recipient] = whatsappCalls[0].body.payload.template.to_and_components;
    assert.equal('header_1' in recipient.components, false);
  });
});

describe('Receipt PDF validation before sending', () => {
  it('rejects empty and non-PDF buffers', () => {
    assert.throws(() => assertPdf(Buffer.alloc(0)), /empty/);
    assert.throws(() => assertPdf(Buffer.from('<html>not a pdf</html>')), /not a valid PDF/);
    assert.doesNotThrow(() => assertPdf(Buffer.from('%PDF-1.3 ...')));
  });

  it('never logs a signed media link', () => {
    const line = redactSecrets(
      'fetch https://api.cloudinary.com/v1_1/x/raw/download?api_key=123&signature=abcdef&expires_at=9',
    );
    assert.ok(!line.includes('abcdef'));
    assert.ok(line.includes('signature=[REDACTED]'));
  });
});

describe('checkout category lookup (id, then stable code)', () => {
  function seedCategory(code: string, active = true) {
    const id = randomUUID();
    db.categories.set(id, { id, code, nameEn: code, active });
    return id;
  }
  function initiateWith(category: { categoryId: string; categoryCode?: string }) {
    return initiateDonation({
      donorName: 'Ravi Kumar',
      donorPhone: '9876543210',
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123456789012',
      ...category,
      amount: 501,
      idempotencyKey: `idem-${randomUUID()}`,
    });
  }

  it('a valid category id proceeds to Razorpay order creation', async () => {
    const orders = mock.method(getRazorpayClient().orders, 'create', async () => ({
      id: 'order_ok',
    }));
    const id = seedCategory('GENERAL_DONATION');
    const session = await initiateWith({ categoryId: id, categoryCode: 'GENERAL_DONATION' });
    assert.equal(orders.mock.callCount(), 1);
    assert.equal(db.donations.get(session.donationId)?.categoryId, id);
  });

  it('a stale snapshot id resolves by its code to the live category', async () => {
    const orders = mock.method(getRazorpayClient().orders, 'create', async () => ({
      id: 'order_ok',
    }));
    const liveId = seedCategory('ANNAPRASADAM');
    const session = await initiateWith({ categoryId: randomUUID(), categoryCode: 'ANNAPRASADAM' });
    assert.equal(orders.mock.callCount(), 1);
    assert.equal(db.donations.get(session.donationId)?.categoryId, liveId);
  });

  it('an unknown id with no code, an unknown code, or an inactive code is rejected before any order', async () => {
    const orders = mock.method(getRazorpayClient().orders, 'create', async () => ({
      id: 'order_x',
    }));
    seedCategory('OLD_GOSHALA', false);
    for (const attempt of [
      { categoryId: randomUUID() },
      { categoryId: randomUUID(), categoryCode: 'NO_SUCH_CODE' },
      { categoryId: randomUUID(), categoryCode: 'OLD_GOSHALA' },
    ]) {
      await assert.rejects(() => initiateWith(attempt), /Selected donation category was not found/);
    }
    assert.equal(orders.mock.callCount(), 0);
  });

  it('the request schema accepts the website payload and rejects a malformed code', () => {
    const base = {
      donorName: 'Ravi Kumar',
      donorPhone: '9876543210',
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123456789012',
      categoryId: '00000000-0000-4000-8000-000000000000',
      amount: 1,
      idempotencyKey: 'idem-12345678',
    };
    assert.equal(
      initiateDonationSchema.parse({ ...base, categoryCode: 'GENERAL_DONATION' }).categoryCode,
      'GENERAL_DONATION',
    );
    assert.equal(initiateDonationSchema.parse(base).categoryCode, undefined);
    assert.equal(
      initiateDonationSchema.safeParse({ ...base, categoryCode: "x'; DROP" }).success,
      false,
    );
  });
});
