import { db, resetDb, seedPendingDonation, type SeedOptions } from './helpers/receipt-flow-harness';

import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import winston from 'winston';

import { env, notificationsMode, type Env } from '@config/env';
import { logger } from '@lib/logger';
import { getMailer } from '@integrations/email/mailer';
import { getRazorpayClient } from '@integrations/payments/razorpay.client';
import { verifyAndCompletePayment } from '@services/payment-verification.service';
import { retryReceiptOrgEmail, retryReceiptSms } from '@services/receipt.service';
import { processRazorpayWebhook } from '@services/webhook.service';
import { redactSecrets } from '@utils/redact-secrets';

const ORG_EMAIL = 'sysaorg1@gmail.com';
const FULL_PAN = /[A-Z]{5}\d{4}[A-Z]/;
const PAN_MASKED = '******234F';
const AADHAAR_MASKED = '********9012';

interface SentMail {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

interface WhatsAppBody {
  payload: {
    template: {
      name: string;
      namespace?: string;
      language: { code: string };
      to_and_components: Array<{
        to: string[];
        components: Record<string, { type: string; value: string }>;
      }>;
    };
  };
}

interface SmsBody {
  template_id: string;
  recipients: Array<Record<string, string>>;
}

let razorpayStatus = 'captured';
let smtpAccepts = true;
let whatsappOk = true;
let whatsappErrorMessage = 'Template variables mismatch';
let smsOk = true;
let sentMail: SentMail[] = [];
let whatsappBodies: WhatsAppBody[] = [];
let smsBodies: SmsBody[] = [];

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
  smsOk = true;
  sentMail = [];
  whatsappBodies = [];
  smsBodies = [];

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
    if (url.includes('whatsapp-outbound-message')) {
      whatsappBodies.push(JSON.parse(String(init?.body)) as WhatsAppBody);
      return whatsappOk
        ? jsonResponse(200, { status: 'success', hasError: false, data: { request_id: 'wa-1' } })
        : jsonResponse(400, { status: 'fail', hasError: true, message: whatsappErrorMessage });
    }
    if (url.includes('/flow')) {
      smsBodies.push(JSON.parse(String(init?.body)) as SmsBody);
      return smsOk
        ? jsonResponse(200, { type: 'success', message: 'sms-1' })
        : jsonResponse(200, { type: 'error', message: 'Template not approved' });
    }
    throw new Error(`Unexpected outbound request in test: ${url}`);
  });
});

afterEach(() => {
  mock.restoreAll();
  env.NOTIFICATIONS_MODE = undefined;
});

/** Seeds a pending donation whose donor gave PAN/Aadhaar — stored, as in
 * production, only in masked form. */
function seedDonorWithIdentity(options: SeedOptions = {}) {
  const seeded = seedPendingDonation(options);
  const donorId = db.donations.get(seeded.donationId)?.donorId as string;
  const donor = db.donors.get(donorId) as Record<string, unknown>;
  Object.assign(donor, {
    panNumberMasked: PAN_MASKED,
    aadhaarNumberMasked: AADHAAR_MASKED,
    address: 'Sai Sindura PG',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500082',
  });
  return seeded;
}

function checkoutSignature(orderId: string, paymentId: string): string {
  return createHmac('sha256', env.RAZORPAY_KEY_SECRET as string)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

function webhook(event: string, orderId: string, paymentId: string) {
  const raw = Buffer.from(
    JSON.stringify({
      event,
      payload: { payment: { entity: { id: paymentId, order_id: orderId, method: 'upi' } } },
    }),
  );
  const signature = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET as string)
    .update(raw.toString('utf8'))
    .digest('hex');
  return { raw, signature };
}

async function payAndVerify(options: SeedOptions = {}) {
  const { donationId, orderId } = seedDonorWithIdentity(options);
  const paymentId = `pay_${donationId.slice(0, 8)}`;
  await verifyAndCompletePayment({
    donationId,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: checkoutSignature(orderId, paymentId),
  });
  return { donationId, orderId, paymentId };
}

function receiptFor(donationId: string) {
  const rows = [...db.receipts.values()].filter((r) => r.donationId === donationId);
  assert.ok(rows.length <= 1, 'more than one receipt for a donation');
  return rows[0];
}

const orgMail = () => sentMail.filter((m) => m.to === ORG_EMAIL);
const donorMail = () => sentMail.filter((m) => m.to !== ORG_EMAIL);

function assertNothingSent(): void {
  assert.equal(sentMail.length, 0, 'an email was sent');
  assert.equal(whatsappBodies.length, 0, 'a WhatsApp message was sent');
  assert.equal(smsBodies.length, 0, 'an SMS was sent');
}

describe('Notifications after a verified payment', () => {
  it('sends email to the organisation, plus WhatsApp and SMS to the donor, with one receipt number', async () => {
    const { donationId, paymentId } = await payAndVerify({ amount: 2500 });

    assert.equal(db.donations.get(donationId)?.status, 'completed');
    const receipt = receiptFor(donationId);
    const receiptNumber = receipt.receiptNumber as string;
    assert.equal(receipt.orgEmailStatus, 'sent');
    assert.ok(receipt.orgEmailSentAt instanceof Date);
    assert.equal(receipt.emailStatus, 'sent');
    assert.equal(receipt.whatsappStatus, 'sent');
    assert.equal(receipt.smsStatus, 'sent');

    // Email → sysaorg1@gmail.com with the receipt/reporting fields + PDF.
    assert.equal(env.ORG_RECEIPT_EMAIL, ORG_EMAIL);
    assert.equal(orgMail().length, 1);
    const [mail] = orgMail();
    assert.equal(mail.subject, 'Donation Receipt - Sai Yadadri Seva Ashramam');
    for (const expected of [
      'Donor Name: Ravi Kumar',
      `Receipt Number: ${receiptNumber}`,
      `Payment ID: ${paymentId}`,
      'Donation Category: Annadanam',
      'Donor Email: ravi.kumar@example.com',
      'Donor Mobile: 9876543210',
      'Address: Sai Sindura PG, Hyderabad, Telangana, 500082',
      `PAN: ${PAN_MASKED}`,
      'Aadhaar: XXXX XXXX 9012',
    ]) {
      assert.ok(mail.text.includes(expected), `org email is missing "${expected}"`);
    }
    assert.match(mail.text, /Donation Amount: ₹2,500/);
    assert.match(mail.text, /Donation Date\/Time: /);
    assert.equal(mail.attachments?.length, 1);
    assert.equal(mail.attachments?.[0].content.subarray(0, 5).toString('latin1'), '%PDF-');

    // WhatsApp → donor mobile, approved template, name/amount/receipt only.
    assert.equal(whatsappBodies.length, 1);
    const template = whatsappBodies[0].payload.template;
    assert.equal(template.name, 'sysa_general_update');
    assert.equal(template.namespace, 'f8f2a2af_29b5_4fab_a60c_d1ba6dbfd04f');
    assert.equal(template.language.code, 'en');
    const [recipient] = template.to_and_components;
    assert.deepEqual(recipient.to, ['919876543210']);
    assert.deepEqual(
      Object.fromEntries(Object.entries(recipient.components).map(([k, v]) => [k, v.value])),
      { body_1: 'Ravi Kumar', body_2: '2,500', body_3: receiptNumber },
    );

    // SMS → donor mobile, approved DLT template variables only.
    assert.equal(smsBodies.length, 1);
    assert.equal(smsBodies[0].template_id, env.SMS_DLT_TEMPLATE_ID);
    assert.deepEqual(smsBodies[0].recipients, [
      { mobiles: '919876543210', VAR1: 'Ravi Kumar', VAR2: 'Annadanam', VAR3: '2,500' },
    ]);

    // Donor still receives their own receipt email, same receipt number.
    assert.equal(donorMail().length, 1);
    assert.equal(donorMail()[0].subject, `Payment Receipt - ${receiptNumber}`);
  });

  it('keeps PAN/Aadhaar out of WhatsApp and SMS, and only masked in email', async () => {
    await payAndVerify();

    const whatsappText = JSON.stringify(whatsappBodies);
    const smsText = JSON.stringify(smsBodies);
    for (const text of [whatsappText, smsText]) {
      assert.ok(!FULL_PAN.test(text), 'full PAN pattern in a WhatsApp/SMS payload');
      assert.ok(
        !text.includes('234F') && !text.includes('9012'),
        'PAN/Aadhaar digits in WhatsApp/SMS',
      );
      assert.ok(!/PAN|Aadhaar/i.test(text), 'identity field in WhatsApp/SMS');
    }
    for (const mail of sentMail) {
      assert.ok(!FULL_PAN.test(mail.text) && !FULL_PAN.test(mail.html), 'full PAN in an email');
      assert.ok(
        !/\b\d{12}\b/.test(mail.text.replace('919876543210', '')),
        '12-digit number in an email',
      );
    }
  });
});

describe('No notifications without a verified, captured payment', () => {
  it('sends nothing when Razorpay reports the payment as failed', async () => {
    razorpayStatus = 'failed';
    const { donationId, orderId } = seedDonorWithIdentity();
    await assert.rejects(() =>
      verifyAndCompletePayment({
        donationId,
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_failed',
        razorpaySignature: checkoutSignature(orderId, 'pay_failed'),
      }),
    );
    assert.equal(db.donations.get(donationId)?.status, 'failed');
    assert.equal(receiptFor(donationId), undefined);
    assertNothingSent();
  });

  it('sends nothing for a timed-out / never-completed payment (Razorpay status "created")', async () => {
    razorpayStatus = 'created';
    const { donationId, orderId } = seedDonorWithIdentity();
    await assert.rejects(() =>
      verifyAndCompletePayment({
        donationId,
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_timeout',
        razorpaySignature: checkoutSignature(orderId, 'pay_timeout'),
      }),
    );
    assert.notEqual(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receiptFor(donationId), undefined);
    assertNothingSent();
  });

  it('sends nothing for a payment.failed webhook', async () => {
    const { donationId, orderId } = seedDonorWithIdentity();
    const { raw, signature } = webhook('payment.failed', orderId, 'pay_declined');
    await processRazorpayWebhook(raw, signature);
    assert.notEqual(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receiptFor(donationId), undefined);
    assertNothingSent();
  });

  it('sends nothing for a forged client-side success callback (bad signature)', async () => {
    const { donationId, orderId } = seedDonorWithIdentity();
    await assert.rejects(() =>
      verifyAndCompletePayment({
        donationId,
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_forged',
        razorpaySignature: 'not-a-real-signature',
      }),
    );
    assert.equal(receiptFor(donationId), undefined);
    assertNothingSent();
  });
});

describe('Idempotency', () => {
  it('duplicate webhooks plus a verify callback send each channel exactly once', async () => {
    const { donationId, orderId, paymentId } = await payAndVerify();
    const { raw, signature } = webhook('payment.captured', orderId, paymentId);
    await processRazorpayWebhook(raw, signature);
    await processRazorpayWebhook(raw, signature);

    receiptFor(donationId);
    assert.equal(orgMail().length, 1);
    assert.equal(donorMail().length, 1);
    assert.equal(whatsappBodies.length, 1);
    assert.equal(smsBodies.length, 1);
  });

  it('a verify/webhook race sends each channel (including SMS) exactly once', async () => {
    const { donationId, orderId } = seedDonorWithIdentity();
    const paymentId = 'pay_race';
    const { raw, signature } = webhook('payment.captured', orderId, paymentId);
    await Promise.all([
      verifyAndCompletePayment({
        donationId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: checkoutSignature(orderId, paymentId),
      }),
      processRazorpayWebhook(raw, signature),
    ]);

    receiptFor(donationId);
    assert.equal(orgMail().length, 1);
    assert.equal(whatsappBodies.length, 1);
    assert.equal(smsBodies.length, 1);
  });
});

describe('Provider failures never affect the payment', () => {
  it('email failure: payment stays completed, failure recorded, retry sends once with the same receipt', async () => {
    smtpAccepts = false;
    const { donationId } = await payAndVerify();
    const before = receiptFor(donationId);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(before.orgEmailStatus, 'failed');
    assert.match(String(before.orgEmailFailureReason), /SMTP rejected/);
    assert.equal(before.whatsappStatus, 'sent');

    smtpAccepts = true;
    const attempts = orgMail().length;
    assert.equal(await retryReceiptOrgEmail(donationId), 'sent');
    assert.equal(await retryReceiptOrgEmail(donationId), 'sent');
    assert.equal(orgMail().length, attempts + 1);
    assert.equal(receiptFor(donationId).receiptNumber, before.receiptNumber);
    assert.ok(
      orgMail()
        .at(-1)
        ?.text.includes(before.receiptNumber as string),
    );
  });

  it('WhatsApp failure: payment stays completed and the other channels still go out', async () => {
    whatsappOk = false;
    const { donationId } = await payAndVerify();
    const receipt = receiptFor(donationId);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receipt.whatsappStatus, 'failed');
    assert.equal(receipt.orgEmailStatus, 'sent');
    assert.equal(receipt.smsStatus, 'sent');
  });

  it('SMS failure: payment stays completed, failure recorded, retry sends once', async () => {
    smsOk = false;
    const { donationId } = await payAndVerify();
    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.equal(receiptFor(donationId).smsStatus, 'failed');
    assert.equal(receiptFor(donationId).orgEmailStatus, 'sent');

    smsOk = true;
    const attempts = smsBodies.length;
    assert.equal(await retryReceiptSms(donationId), 'sent');
    assert.equal(await retryReceiptSms(donationId), 'sent');
    assert.equal(smsBodies.length, attempts + 1);
    assert.equal(db.donations.get(donationId)?.status, 'completed');
  });
});

describe('Dry-run mode (local / Razorpay test mode)', () => {
  it('records every channel as not sent and contacts no provider', async () => {
    env.NOTIFICATIONS_MODE = 'dry_run';
    const { donationId } = await payAndVerify();
    const receipt = receiptFor(donationId);

    assert.equal(db.donations.get(donationId)?.status, 'completed');
    assert.ok(receipt.receiptNumber, 'receipt is still generated');
    assertNothingSent();
    assert.equal(receipt.orgEmailStatus, 'not_configured');
    assert.equal(receipt.emailStatus, 'not_configured');
    assert.equal(receipt.whatsappStatus, 'not_configured');
    assert.equal(receipt.smsStatus, 'not_configured');
    assert.match(String(receipt.orgEmailFailureReason), /dry-run/);
  });

  it('defaults to dry run in development and for rzp_test_ keys, live for live keys', () => {
    const base = { ...env, NOTIFICATIONS_MODE: undefined } as Env;
    assert.equal(notificationsMode({ ...base, NODE_ENV: 'development' }), 'dry_run');
    assert.equal(
      notificationsMode({ ...base, NODE_ENV: 'production', RAZORPAY_KEY_ID: 'rzp_test_abc' }),
      'dry_run',
    );
    assert.equal(
      notificationsMode({ ...base, NODE_ENV: 'production', RAZORPAY_KEY_ID: 'rzp_live_abc' }),
      'live',
    );
    assert.equal(
      notificationsMode({ ...base, NODE_ENV: 'development', NOTIFICATIONS_MODE: 'live' }),
      'live',
    );
  });
});

describe('PAN/Aadhaar redaction in logs and stored errors', () => {
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

  it('redacts full PAN and Aadhaar from log messages and metadata', () => {
    const capture = captureLogs();
    try {
      logger.error('Donor ABCDE1234F failed', {
        aadhaar: '1234 5678 9012',
        nested: { raw: 'aadhaar=123456789012 pan=PQRSX6789K' },
      });
    } finally {
      capture.stop();
    }
    const text = capture.lines.join('\n');
    assert.ok(capture.lines.length > 0);
    for (const value of ['ABCDE1234F', 'PQRSX6789K', '1234 5678 9012', '123456789012']) {
      assert.ok(!text.includes(value), `log contained ${value}`);
    }
    assert.match(text, /\[PAN REDACTED\]/);
    assert.match(text, /\[AADHAAR REDACTED\]/);
  });

  it('redacts identity numbers a provider echoes into a stored failure reason', async () => {
    whatsappOk = false;
    whatsappErrorMessage = 'Rejected payload for ABCDE1234F / 1234-5678-9012';
    const capture = captureLogs();
    let donationId: string;
    try {
      ({ donationId } = await payAndVerify());
    } finally {
      capture.stop();
    }
    const reason = String(receiptFor(donationId).whatsappFailureReason);
    assert.equal(reason, 'Rejected payload for [PAN REDACTED] / [AADHAAR REDACTED]');
    const logText = capture.lines.join('\n');
    assert.ok(!logText.includes('ABCDE1234F') && !logText.includes('1234-5678-9012'));
  });

  it('leaves ordinary values (masked forms, receipt numbers, amounts) intact', () => {
    const text = `PAN ${PAN_MASKED} RCPT-2026-000123 ₹2,500 order_Abc123`;
    assert.equal(redactSecrets(text), text);
  });
});
