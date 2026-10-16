import './setup-env';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { env } from '@config/env';
import { donationReceiptEmail } from '@integrations/email/templates/donation.templates';
import { evaluateSmtpResult, sendMail } from '@integrations/email/mailer';
import {
  sendWhatsAppReceipt,
  toWhatsAppMobile,
  isPublicHttpUrl,
  buildMsg91WhatsAppPayload,
  providerErrorCodes,
} from '@integrations/whatsapp/whatsapp.service';
import { sendSms } from '@integrations/sms/sms.service';
import winston from 'winston';
import { logger } from '@lib/logger';
import { maskEmail, maskPhone } from '@utils/pii-mask';
import { ApiError } from '@utils/api-error';
import { processRazorpayWebhook } from '@services/webhook.service';

describe('Receipt email template', () => {
  it('uses the receipt subject, donor greeting and a clear donation confirmation', () => {
    const email = donationReceiptEmail({
      donorName: 'Ravi',
      amount: 501,
      currency: 'INR',
      categoryName: 'Annadanam',
      receiptNumber: 'RCPT-2026-000001',
      receiptUrl: 'https://example.com/receipt.pdf',
      donationDate: '05 Sep 2026',
      paymentId: 'pay_test123',
      orderId: 'order_test123',
      orgWebsite: 'https://sysa.in',
    });

    assert.equal(
      email.subject,
      'Donation Receipt — Sai Yadadri Seva Ashram — Receipt RCPT-2026-000001',
    );
    assert.match(email.text, /^Dear Ravi,/);
    assert.ok(
      email.text.includes(
        'We confirm that your donation of ₹501 towards Annadanam has been received successfully by Sai Yadadri Seva Ashram.',
      ),
    );
    assert.ok(email.text.includes('Your official receipt is attached to this email as a PDF.'));
    for (const [label, value] of [
      ['Receipt Number', 'RCPT-2026-000001'],
      ['Donor Name', 'Ravi'],
      ['Donation Category', 'Annadanam'],
      ['Amount', '₹501'],
      ['Donation Date', '05 Sep 2026'],
      ['Payment Status', 'Paid Successfully'],
      ['Razorpay Payment ID', 'pay_test123'],
      ['Razorpay Order ID', 'order_test123'],
    ]) {
      assert.ok(
        email.text.includes(`${label}: ${value}`),
        `email text is missing "${label}: ${value}"`,
      );
      assert.ok(
        email.html.includes(`>${label}</td>`) && email.html.includes(`>${value}</td>`),
        `email html is missing "${label}: ${value}"`,
      );
    }
    assert.match(email.text, /https:\/\/sysa\.in/);
    assert.match(email.html, /receipt is attached to this email as a PDF/);
    assert.match(email.html, /href="https:\/\/example\.com\/receipt\.pdf"/);
  });

  it('shows paise with two decimals and leaves out references that do not exist', () => {
    const email = donationReceiptEmail({
      donorName: 'Ravi',
      amount: 1000.5,
      currency: 'INR',
      categoryName: 'Annadanam',
      receiptNumber: 'RCPT-2026-000002',
      receiptUrl: null,
      donationDate: '05 Sep 2026',
      paymentId: null,
      orderId: '6f1c2c1e-0000-4000-8000-000000000000',
    });
    assert.ok(email.text.includes('Amount: ₹1,000.50'));
    assert.ok(!email.text.includes('Razorpay Payment ID'));
    // A non-Razorpay (manual) donation is referenced as such, not as an order.
    assert.ok(email.text.includes('Donation Reference: 6f1c2c1e-0000-4000-8000-000000000000'));
    assert.ok(!email.text.includes('Razorpay Order ID'));
    assert.ok(!email.text.includes('Download your receipt'));
    assert.doesNotMatch(email.text, /null|undefined/);
  });

  it('HTML-escapes donor-supplied values', () => {
    const email = donationReceiptEmail({
      donorName: '<img src=x onerror=alert(1)>',
      amount: 501,
      currency: 'INR',
      categoryName: 'Annadanam',
      receiptNumber: 'RCPT-2026-000001',
      receiptUrl: null,
      donationDate: '05 Sep 2026',
      paymentId: 'pay_test123',
    });
    assert.ok(!email.html.includes('<img src=x'));
    assert.match(email.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });
});

describe('SMTP acceptance rules', () => {
  it('marks sent only when SMTP accepted the recipient', () => {
    const sent = evaluateSmtpResult({
      accepted: ['donor@example.com'],
      rejected: [],
      messageId: '<abc@smtp>',
      response: '250 OK',
    });
    assert.equal(sent.status, 'sent');
    assert.equal(sent.messageId, '<abc@smtp>');

    const rejected = evaluateSmtpResult({
      accepted: [],
      rejected: ['donor@example.com'],
      response: '550 user unknown',
    });
    assert.equal(rejected.status, 'failed');
    assert.match(rejected.failureReason ?? '', /rejected/);
  });

  it('handles MailChannels 550 5.7.1 recipient block responses accurately', () => {
    const mailchannelsReject = evaluateSmtpResult({
      accepted: [],
      rejected: ['smstest-1787588969557@example.com'],
      messageId: '<bounce@mailchannels>',
      response: '550 5.7.1 [RB] This recipient email address has been blocked.',
    });
    assert.equal(mailchannelsReject.status, 'failed');
    assert.equal(mailchannelsReject.messageId, '<bounce@mailchannels>');
    assert.match(mailchannelsReject.failureReason ?? '', /550 5\.7\.1 \[RB\]/);
  });

  it('marks failed when no recipients were accepted even if rejected list is empty', () => {
    const noAccept = evaluateSmtpResult({
      accepted: [],
      rejected: [],
      response: '421 Service not available',
    });
    assert.equal(noAccept.status, 'failed');
    assert.match(noAccept.failureReason ?? '', /did not accept the recipient/);
  });

  it('returns not_configured when SMTP is not configured in sendMail', async () => {
    const result = await sendMail({
      to: 'donor@gmail.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });
    assert.equal(result.status, 'not_configured');
    assert.match(result.failureReason ?? '', /SMTP is not configured/);
  });
});

describe('WhatsApp MSG91 integration', () => {
  it('returns not_configured when MSG91 WhatsApp credentials are absent', async () => {
    const result = await sendWhatsAppReceipt({
      to: '9490118877',
      customerName: 'Ravi',
      amountFormatted: '501',
      receiptNumber: 'RCPT-2026-000001',
      donationDate: '05 Sep 2026',
      paymentId: 'pay_test123',
      documentUrl: 'https://example.com/receipt.pdf',
      filename: 'Payment-Receipt.pdf',
    });
    assert.equal(result.status, 'not_configured');
    assert.match(result.failureReason ?? '', /MSG91 WhatsApp is not configured/);
  });

  it('formats Indian mobiles as 91XXXXXXXXXX and rejects localhost PDF URLs', () => {
    assert.equal(toWhatsAppMobile('9490118877'), '919490118877');
    assert.equal(toWhatsAppMobile('+91 94901 18877'), '919490118877');
    assert.equal(toWhatsAppMobile('09490118877'), '919490118877');
    assert.equal(isPublicHttpUrl('https://res.cloudinary.com/demo/receipt.pdf'), true);
    assert.equal(isPublicHttpUrl('http://localhost:5050/receipt.pdf'), false);
  });

  it('maps sysa_donation_receipt as {{1}} donor name, {{2}} amount, {{3}} receipt number', () => {
    const prev = env.MSG91_WHATSAPP_TEMPLATE_NAME;
    const prevVars = env.MSG91_WHATSAPP_TEMPLATE_VARS;
    env.MSG91_WHATSAPP_TEMPLATE_NAME = 'sysa_donation_receipt';
    env.MSG91_WHATSAPP_TEMPLATE_VARS = undefined;
    try {
      const payloadResult = buildMsg91WhatsAppPayload({
        to: '9490118877',
        customerName: 'Ravi Kumar',
        amountFormatted: '1,000',
        receiptNumber: 'RCPT-2026-000001',
        donationDate: '10 Oct 2026',
        paymentId: 'pay_test123',
        documentUrl: null,
        filename: 'Receipt.pdf',
      });
      assert.equal(payloadResult.ok, true);
      if (payloadResult.ok) {
        const target = payloadResult.payload.payload.template.to_and_components[0];
        assert.equal(payloadResult.payload.payload.template.name, 'sysa_donation_receipt');
        assert.deepEqual(target.components, {
          body_1: { type: 'text', value: 'Ravi Kumar' },
          body_2: { type: 'text', value: '1,000' },
          body_3: { type: 'text', value: 'RCPT-2026-000001' },
        });
        assert.deepEqual(target.to, ['919490118877']);
      }
    } finally {
      env.MSG91_WHATSAPP_TEMPLATE_NAME = prev;
      env.MSG91_WHATSAPP_TEMPLATE_VARS = prevVars;
    }
  });

  it('refuses the marketing template and unapproved templates without calling MSG91', async () => {
    const keys = [
      'MSG91_WHATSAPP_AUTHKEY',
      'MSG91_WHATSAPP_INTEGRATED_NUMBER',
      'MSG91_WHATSAPP_TEMPLATE_NAME',
      'MSG91_WHATSAPP_TEMPLATE_ID',
      'MSG91_WHATSAPP_TEMPLATE_APPROVED',
    ] as const;
    const saved = Object.fromEntries(keys.map((k) => [k, env[k]]));
    const calls: string[] = [];
    mock.method(globalThis, 'fetch', async (input: string | URL) => {
      calls.push(String(input));
      return new Response('{}', { status: 200 });
    });
    const input = {
      to: '9876543210',
      customerName: 'Ravi',
      amountFormatted: '501',
      receiptNumber: 'RCPT-2026-000001',
      donationDate: '05 Sep 2026',
      paymentId: 'pay_x',
      documentUrl: null,
      filename: 'r.pdf',
    };
    try {
      Object.assign(env, {
        MSG91_WHATSAPP_AUTHKEY: 'test-key-value',
        MSG91_WHATSAPP_INTEGRATED_NUMBER: '919490118877',
        MSG91_WHATSAPP_TEMPLATE_NAME: 'sysa_general_update',
        MSG91_WHATSAPP_TEMPLATE_APPROVED: 'true',
      });
      const marketing = await sendWhatsAppReceipt(input);
      assert.equal(marketing.status, 'not_configured');
      assert.match(marketing.failureReason ?? '', /marketing template/);

      // Live mode fails safe without the verified template id …
      Object.assign(env, {
        MSG91_WHATSAPP_TEMPLATE_NAME: 'sysa_donation_receipt',
        MSG91_WHATSAPP_TEMPLATE_ID: undefined,
        MSG91_WHATSAPP_TEMPLATE_APPROVED: 'true',
      });
      const noId = await sendWhatsAppReceipt(input);
      assert.equal(noId.status, 'not_configured');
      assert.match(noId.failureReason ?? '', /MSG91_WHATSAPP_TEMPLATE_ID is not set/);

      // … and without confirmed Meta approval.
      Object.assign(env, {
        MSG91_WHATSAPP_TEMPLATE_ID: '567627',
        MSG91_WHATSAPP_TEMPLATE_APPROVED: undefined,
      });
      const unapproved = await sendWhatsAppReceipt(input);
      assert.equal(unapproved.status, 'not_configured');
      assert.match(
        unapproved.failureReason ?? '',
        /approval of sysa_donation_receipt is not confirmed/,
      );

      assert.deepEqual(calls, []);
    } finally {
      mock.restoreAll();
      Object.assign(env, saved);
    }
  });
});

describe('MSG91 Flow SMS integration', () => {
  it('returns not_configured when SMS credentials are not set', async () => {
    const result = await sendSms('9876543210', {
      donorName: 'Ravi Kumar',
      category: 'Annadanam',
      amount: '1,000',
    });
    assert.equal(result, 'not_configured');
  });

  it('fills the verified flow variables name / amount / receipt', async () => {
    const saved = {
      SMS_PROVIDER_API_KEY: env.SMS_PROVIDER_API_KEY,
      SMS_SENDER_ID: env.SMS_SENDER_ID,
      SMS_DLT_TEMPLATE_ID: env.SMS_DLT_TEMPLATE_ID,
      SMS_DLT_CONTENT_VERIFIED: env.SMS_DLT_CONTENT_VERIFIED,
      SMS_PROVIDER_TEMPLATE_VARS: env.SMS_PROVIDER_TEMPLATE_VARS,
    };
    const bodies: Array<{ template_id: string; recipients: Array<Record<string, string>> }> = [];
    mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response('{"type":"success","message":"req-1"}', { status: 200 });
    });
    try {
      Object.assign(env, {
        SMS_PROVIDER_API_KEY: 'mock_authkey',
        SMS_SENDER_ID: 'SYSAOF',
        SMS_DLT_TEMPLATE_ID: '6abd3c3362121d42e10c6c22',
        SMS_DLT_CONTENT_VERIFIED: 'true',
        SMS_PROVIDER_TEMPLATE_VARS:
          '{"donorName":"name","amount":"amount","receiptNumber":"receipt"}',
      });
      const result = await sendSms('9876543210', {
        donorName: 'Ravi Kumar',
        category: 'Annadanam',
        amount: '1,000',
        receiptNumber: 'RCPT-2026-000001',
      });
      assert.equal(result, 'sent');
      assert.equal(bodies[0].template_id, '6abd3c3362121d42e10c6c22');
      const [recipient] = bodies[0].recipients;
      assert.equal(recipient.mobiles, '919876543210');
      assert.equal(recipient.name, 'Ravi Kumar');
      assert.equal(recipient.amount, '1,000');
      assert.equal(recipient.receipt, 'RCPT-2026-000001');
    } finally {
      mock.restoreAll();
      Object.assign(env, saved);
    }
  });

  it('refuses live SMS until the DLT content template is confirmed', async () => {
    const saved = {
      SMS_PROVIDER_API_KEY: env.SMS_PROVIDER_API_KEY,
      SMS_SENDER_ID: env.SMS_SENDER_ID,
      SMS_DLT_TEMPLATE_ID: env.SMS_DLT_TEMPLATE_ID,
      SMS_DLT_CONTENT_VERIFIED: env.SMS_DLT_CONTENT_VERIFIED,
    };
    let calls = 0;
    mock.method(globalThis, 'fetch', async () => {
      calls += 1;
      return new Response('{"type":"success","message":"x"}', { status: 200 });
    });
    try {
      Object.assign(env, {
        SMS_PROVIDER_API_KEY: 'mock_authkey',
        SMS_SENDER_ID: 'SYSAOF',
        SMS_DLT_TEMPLATE_ID: '6abd3c3362121d42e10c6c22',
        SMS_DLT_CONTENT_VERIFIED: undefined,
      });
      const result = await sendSms('9876543210', {
        donorName: 'Ravi Kumar',
        category: 'Annadanam',
        amount: '1,000',
        receiptNumber: 'RCPT-2026-000001',
      });
      assert.equal(result, 'not_configured');
      assert.equal(calls, 0);
    } finally {
      mock.restoreAll();
      Object.assign(env, saved);
    }
  });

  it('handles provider error responses like "Template not approved" as failed', async () => {
    const originalFetch = globalThis.fetch;
    const prevKey = env.SMS_PROVIDER_API_KEY;
    const prevSender = env.SMS_SENDER_ID;
    const prevTpl = env.SMS_DLT_TEMPLATE_ID;

    (env as { SMS_PROVIDER_API_KEY?: string }).SMS_PROVIDER_API_KEY = 'mock_authkey';
    (env as { SMS_SENDER_ID?: string }).SMS_SENDER_ID = 'SYSAOF';
    (env as { SMS_DLT_TEMPLATE_ID?: string }).SMS_DLT_TEMPLATE_ID = '6abd3c3362121d42e10c6c22';
    const prevVerified = env.SMS_DLT_CONTENT_VERIFIED;
    env.SMS_DLT_CONTENT_VERIFIED = 'true';

    try {
      mock.method(globalThis, 'fetch', async () => {
        return new Response(JSON.stringify({ type: 'error', message: 'Template not approved' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const result = await sendSms('9876543210', {
        donorName: 'Ravi Kumar',
        category: 'Annadanam',
        amount: '1,000',
        receiptNumber: 'RCPT-2026-000001',
      });
      assert.equal(result, 'failed');
    } finally {
      mock.restoreAll();
      globalThis.fetch = originalFetch;
      (env as { SMS_PROVIDER_API_KEY?: string }).SMS_PROVIDER_API_KEY = prevKey;
      (env as { SMS_SENDER_ID?: string }).SMS_SENDER_ID = prevSender;
      (env as { SMS_DLT_TEMPLATE_ID?: string }).SMS_DLT_TEMPLATE_ID = prevTpl;
      env.SMS_DLT_CONTENT_VERIFIED = prevVerified;
    }
  });
});

describe('Controlled WhatsApp test script', () => {
  it('only allows the approved receipt template — never sysa_general_update', async () => {
    const { checkControlledSendConfig } = await import('../../scripts/msg91-whatsapp-receipt-test');
    const ready = {
      MSG91_WHATSAPP_TEMPLATE_NAME: 'sysa_donation_receipt',
      MSG91_WHATSAPP_TEMPLATE_ID: '567627',
      MSG91_WHATSAPP_TEMPLATE_APPROVED: 'true',
      MSG91_WHATSAPP_AUTHKEY: 'present',
      MSG91_WHATSAPP_INTEGRATED_NUMBER: '919490118877',
    };
    assert.deepEqual(checkControlledSendConfig(ready), []);
    assert.match(
      checkControlledSendConfig({
        ...ready,
        MSG91_WHATSAPP_TEMPLATE_NAME: 'sysa_general_update',
      }).join(' '),
      /never the marketing template sysa_general_update/,
    );
    assert.match(
      checkControlledSendConfig({ ...ready, MSG91_WHATSAPP_TEMPLATE_ID: undefined }).join(' '),
      /MSG91_WHATSAPP_TEMPLATE_ID is not set/,
    );
    assert.match(
      checkControlledSendConfig({ ...ready, MSG91_WHATSAPP_TEMPLATE_APPROVED: undefined }).join(
        ' ',
      ),
      /MSG91_WHATSAPP_TEMPLATE_APPROVED is not true/,
    );
  });

  it('importing the script loads no real credentials into the test process', async () => {
    await import('../../scripts/msg91-whatsapp-receipt-test');
    // assert.ok, not assert.equal: a failure must never print the secret value.
    assert.ok(!process.env.MSG91_AUTHKEY, 'MSG91_AUTHKEY leaked into the test process');
    assert.ok(!process.env.SMTP_PASSWORD, 'SMTP_PASSWORD leaked into the test process');
    assert.ok(
      process.env.RAZORPAY_KEY_SECRET === 'test_razorpay_key_secret',
      'RAZORPAY_KEY_SECRET is not the test value',
    );
  });
});

describe('MSG91 rejection details', () => {
  const input = {
    to: '9876543210',
    customerName: 'Ravi',
    amountFormatted: '501',
    receiptNumber: 'RCPT-2026-000001',
    donationDate: '05 Sep 2026',
    paymentId: 'pay_x',
    documentUrl: null,
    filename: 'r.pdf',
  };
  const keys = [
    'MSG91_WHATSAPP_AUTHKEY',
    'MSG91_WHATSAPP_INTEGRATED_NUMBER',
    'MSG91_WHATSAPP_TEMPLATE_NAME',
    'MSG91_WHATSAPP_TEMPLATE_ID',
    'MSG91_WHATSAPP_TEMPLATE_APPROVED',
    'MSG91_WHATSAPP_TEMPLATE_VARS',
  ] as const;

  async function sendWith(status: number, body: unknown) {
    const saved = Object.fromEntries(keys.map((k) => [k, env[k]]));
    let calls = 0;
    mock.method(globalThis, 'fetch', async () => {
      calls += 1;
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    try {
      Object.assign(env, {
        MSG91_WHATSAPP_AUTHKEY: 'test-key-value',
        MSG91_WHATSAPP_INTEGRATED_NUMBER: '919490118877',
        MSG91_WHATSAPP_TEMPLATE_NAME: 'sysa_donation_receipt',
        MSG91_WHATSAPP_TEMPLATE_ID: '567627',
        MSG91_WHATSAPP_TEMPLATE_APPROVED: 'true',
        MSG91_WHATSAPP_TEMPLATE_VARS: undefined,
      });
      return { result: await sendWhatsAppReceipt(input), calls };
    } finally {
      mock.restoreAll();
      Object.assign(env, saved);
    }
  }

  it('treats an "unsupported" rejection as permanent and keeps its error code', async () => {
    const { result, calls } = await sendWith(400, {
      hasError: true,
      status: 'fail',
      message: 'Unsupported message type',
      errors: [{ code: 131051, title: 'Unsupported message type' }],
    });
    assert.equal(calls, 1);
    assert.equal(result.status, 'failed');
    assert.equal(result.permanent, true);
    assert.equal(result.failureReason, 'Unsupported message type (code 131051)');
  });

  it('keeps nested Meta codes and classifies 5xx as transient', async () => {
    const { result } = await sendWith(503, {
      hasError: true,
      message: 'Upstream error',
      data: { errors: [{ error_code: '131000' }] },
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.permanent, false);
    assert.equal(result.failureReason, 'Upstream error (code 131000)');
  });

  it('extracts only numeric error codes', () => {
    assert.deepEqual(
      providerErrorCodes({ code: 'abc', errors: [{ code: 131049 }, { errorCode: '131026' }] }),
      ['131049', '131026'],
    );
    assert.deepEqual(providerErrorCodes(null), []);
  });
});

describe('Logging during tests', () => {
  it('never writes test output into the real logs/ files', () => {
    const fileTransports = logger.transports.filter((t) => t instanceof winston.transports.File);
    assert.equal(fileTransports.length, 0);
  });
});

describe('PII masking in logs', () => {
  it('masks email local-part and phone digits', () => {
    assert.equal(maskEmail('ravi.kumar@example.com'), 'r***@example.com');
    assert.match(maskPhone('9490118877'), /\*+8877/);
  });
});

describe('Razorpay webhook signature gate', () => {
  it('rejects an invalid webhook signature before processing', async () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    await assert.rejects(
      () => processRazorpayWebhook(rawBody, 'invalid'),
      (error: unknown) => error instanceof ApiError && error.statusCode === 401,
    );
  });
});

describe('MSG91 WhatsApp test script safety gate', () => {
  it('fails closed when TEST_RECIPIENT_PHONE is missing or empty', async () => {
    const { resolveTestRecipient } = await import('../../scripts/msg91-whatsapp-receipt-test');
    const result1 = resolveTestRecipient({});
    assert.equal(result1.ok, false);
    assert.match(result1.error, /TEST_RECIPIENT_PHONE environment variable is required/);

    const result2 = resolveTestRecipient({ TEST_RECIPIENT_PHONE: '   ' });
    assert.equal(result2.ok, false);
    assert.match(result2.error, /TEST_RECIPIENT_PHONE environment variable is required/);
  });

  it('rejects when TEST_RECIPIENT_PHONE equals the integrated sender number', async () => {
    const { resolveTestRecipient } = await import('../../scripts/msg91-whatsapp-receipt-test');
    const result = resolveTestRecipient({
      TEST_RECIPIENT_PHONE: '+91 94901 18877',
      MSG91_WHATSAPP_NUMBER: '919490118877',
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /cannot be the integrated sender number/);
  });

  it('rejects invalid mobile numbers without sending', async () => {
    const { resolveTestRecipient } = await import('../../scripts/msg91-whatsapp-receipt-test');
    const result = resolveTestRecipient({
      TEST_RECIPIENT_PHONE: '12345',
      MSG91_WHATSAPP_NUMBER: '919490118877',
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /not a valid 10-digit Indian mobile/);
  });

  it('accepts and formats a valid distinct test recipient', async () => {
    const { resolveTestRecipient } = await import('../../scripts/msg91-whatsapp-receipt-test');
    const result = resolveTestRecipient({
      TEST_RECIPIENT_PHONE: '+91 98765 43210',
      MSG91_WHATSAPP_NUMBER: '919490118877',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.recipient, '9876543210');
      assert.equal(result.formatted, '919876543210');
    }
  });
});

describe('Safe SMTP verification utility', () => {
  it('reports missing host without attempting connection', async () => {
    const { verifySmtpConnection } = await import('../../scripts/verify-smtp-connection');
    const result = await verifySmtpConnection({ host: '' });
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', /SMTP_HOST is not configured/);
  });

  it('resolves SMTP aliases and sets secure mode based on port', async () => {
    const { resolveSmtpConfig } = await import('../../scripts/verify-smtp-connection');
    const config587 = resolveSmtpConfig({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USERNAME: 'user@example.com',
      EMAIL_FROM: 'noreply@example.com',
    });
    assert.equal(config587.port, 587);
    assert.equal(config587.secure, false);
    assert.equal(config587.user, 'user@example.com');
    assert.equal(config587.from, 'noreply@example.com');

    const config465 = resolveSmtpConfig({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_USER: 'user@example.com',
      SMTP_FROM: 'from@example.com',
    });
    assert.equal(config465.port, 465);
    assert.equal(config465.secure, true);
  });

  it('masks emails and redacts credentials in output', async () => {
    const { maskEmail: maskSmtpEmail } = await import('../../scripts/verify-smtp-connection');
    assert.equal(maskSmtpEmail('test.donor@sysaindia.org'), 't***r@sysaindia.org');
    assert.equal(maskSmtpEmail(undefined), '[NOT CONFIGURED]');
  });
});

describe('Send test email script safety gate', () => {
  it('fails closed when TEST_RECIPIENT_EMAIL is missing or empty', async () => {
    const { resolveTestEmailRecipient } = await import('../../scripts/send-test-email');
    const r1 = resolveTestEmailRecipient({});
    assert.equal(r1.ok, false);
    assert.match(r1.error, /TEST_RECIPIENT_EMAIL environment variable is required/);

    const r2 = resolveTestEmailRecipient({ TEST_RECIPIENT_EMAIL: '   ' });
    assert.equal(r2.ok, false);
    assert.match(r2.error, /TEST_RECIPIENT_EMAIL environment variable is required/);
  });

  it('rejects malformed email format', async () => {
    const { resolveTestEmailRecipient } = await import('../../scripts/send-test-email');
    const result = resolveTestEmailRecipient({ TEST_RECIPIENT_EMAIL: 'not-an-email' });
    assert.equal(result.ok, false);
    assert.match(result.error, /not a valid email address format/);
  });

  it('blocks sending to reserved example.com domains with clear explanation', async () => {
    const { resolveTestEmailRecipient } = await import('../../scripts/send-test-email');
    const result = resolveTestEmailRecipient({
      TEST_RECIPIENT_EMAIL: 'smstest-1787588969557@example.com',
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /reserved or non-routable test domain/);
    assert.match(result.error, /550 5\.7\.1 \[RB\]/);
  });

  it('rejects when recipient equals the sender address', async () => {
    const { resolveTestEmailRecipient } = await import('../../scripts/send-test-email');
    const result = resolveTestEmailRecipient({
      TEST_RECIPIENT_EMAIL: 'no-reply@sysa.in',
      EMAIL_FROM: 'no-reply@sysa.in',
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /cannot be the sender email address/);
  });

  it('accepts and normalizes an operator-controlled test recipient', async () => {
    const { resolveTestEmailRecipient } = await import('../../scripts/send-test-email');
    const result = resolveTestEmailRecipient({
      TEST_RECIPIENT_EMAIL: 'dharanilekkala343@gmail.com',
      EMAIL_FROM: 'no-reply@sysa.in',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.recipient, 'dharanilekkala343@gmail.com');
      assert.equal(result.masked, 'd***3@gmail.com');
    }
  });
});
