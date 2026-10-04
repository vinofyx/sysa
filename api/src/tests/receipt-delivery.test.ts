import './setup-env';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { donationReceiptEmail } from '@integrations/email/templates/donation.templates';
import { evaluateSmtpResult } from '@integrations/email/mailer';
import {
  sendWhatsAppReceipt,
  toWhatsAppMobile,
  isPublicHttpUrl,
} from '@integrations/whatsapp/whatsapp.service';
import { maskEmail, maskPhone } from '@utils/pii-mask';
import { ApiError } from '@utils/api-error';
import { processRazorpayWebhook } from '@services/webhook.service';

describe('Receipt email template', () => {
  it('uses the payment-receipt subject and donor greeting', () => {
    const email = donationReceiptEmail({
      donorName: 'Ravi',
      amount: 501,
      currency: 'INR',
      categoryName: 'Annadanam',
      receiptNumber: 'RCPT-2026-000001',
      receiptUrl: 'https://example.com/receipt.pdf',
      donationDate: '05 Sep 2026',
      paymentId: 'pay_test123',
      orgWebsite: 'https://sysa.in',
    });

    assert.equal(email.subject, 'Payment Receipt - RCPT-2026-000001');
    assert.match(email.text, /^Hello Ravi,/);
    assert.match(
      email.text,
      /Thank you for your payment\. Your payment has been successfully received/,
    );
    for (const label of [
      'Receipt Number',
      'Payment ID',
      'Amount',
      'Payment Date',
      'Service/Order',
    ]) {
      assert.match(email.text, new RegExp(`${label}: `));
    }
    assert.match(email.text, /Payment Status: Successful/);
    assert.match(email.text, /RCPT-2026-000001/);
    assert.match(email.text, /pay_test123/);
    assert.match(email.text, /https:\/\/sysa\.in/);
    assert.match(email.html, /payment receipt attached/);
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
