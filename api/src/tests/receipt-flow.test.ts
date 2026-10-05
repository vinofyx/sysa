import {
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
import { getMailer } from '@integrations/email/mailer';
import { getRazorpayClient } from '@integrations/payments/razorpay.client';
import { ApiError } from '@utils/api-error';
import { getDonationStatus } from '@services/donation-checkout.service';
import { verifyAndCompletePayment } from '@services/payment-verification.service';
import { retryReceiptEmail, retryReceiptWhatsApp } from '@services/receipt.service';
import { processRazorpayWebhook } from '@services/webhook.service';

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
let smtpAccepts = true;
let whatsappOk = true;
let whatsappErrorMessage = 'Template variables mismatch';
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
  smtpAccepts = true;
  whatsappOk = true;
  whatsappErrorMessage = 'Template variables mismatch';
  sentMail = [];
  whatsappCalls = [];
  smsCalls = 0;

  mock.method(getRazorpayClient().payments, 'fetch', async (paymentId: string) => ({
    id: paymentId,
    status: razorpayStatus,
    method: 'upi',
    fee: 5000,
    tax: 900,
  }));

  mock.method(getMailer(), 'sendMail', async (message: SentMail) => {
    sentMail.push(message);
    return smtpAccepts
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
          response: '550 mailbox unavailable',
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
        : jsonResponse(400, { status: 'fail', hasError: true, message: whatsappErrorMessage });
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
    assert.equal(mail.subject, `Payment Receipt - ${receiptNumber}`);
    assert.match(mail.text, /2,500/);
    assert.ok(mail.text.includes(paymentId));
    assert.match(mail.text, /Customer Name: Ravi Kumar/);
    assert.ok(
      mail.text.includes(`Order/Donation ID: ${db.donations.get(donationId)?.razorpayOrderId}`),
    );
    assert.match(mail.text, /Payment Status: Successful/);
    assert.equal(mail.attachments?.length, 1);
    const [pdf] = mail.attachments ?? [];
    assert.equal(pdf.contentType, 'application/pdf');
    assert.equal(pdf.filename, `Payment-Receipt-${receiptNumber}.pdf`);
    assert.equal(pdf.content.subarray(0, 5).toString('latin1'), '%PDF-');

    // WhatsApp: customer's number (not the business sender), approved
    // template, backend-only authkey, mapped variables.
    assert.equal(whatsappCalls.length, 1);
    const call = whatsappCalls[0];
    assert.equal(call.headers.authkey, env.MSG91_AUTHKEY);
    assert.equal(call.body.integrated_number, '919490118877');
    const template = call.body.payload.template;
    assert.equal(template.name, 'sysa_general_update');
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
    assert.equal(receipt.whatsappFailureReason, 'Template variables mismatch');
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
    assert.equal(receipt.whatsappStatus, null);
    assert.equal(whatsappCalls.length, 0);
    assert.equal(smsCalls, 0);
  });

  it('handles a donor with no email address: WhatsApp only, no email', async () => {
    const { donationId } = await payAndVerify({ email: null });

    const [receipt] = receiptsFor(donationId);
    assert.equal(receipt.emailStatus, null);
    assert.equal(donorMail().length, 0);
    assert.equal(receipt.whatsappStatus, 'sent');
  });

  it('resends a failed WhatsApp against the same receipt number, and is a no-op once sent', async () => {
    whatsappOk = false;
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
    assert.equal(resent?.subject, `Payment Receipt - ${before.receiptNumber as string}`);
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

describe('Credential and data safety in delivery failures', () => {
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
    assert.equal(receipt.whatsappFailureReason, 'Invalid authkey [REDACTED] for integrated number');

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
        /header_1 needs a public receipt PDF URL/,
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
