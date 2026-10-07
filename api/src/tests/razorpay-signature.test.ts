import './setup-env';

import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { env } from '@config/env';
import { verifyPaymentSignature, verifyWebhookSignature } from '@lib/razorpay-signature';

describe('Razorpay signature verification', () => {
  it('accepts a valid checkout signature', () => {
    const orderId = 'order_test123';
    const paymentId = 'pay_test456';
    const keySecret = env.RAZORPAY_KEY_SECRET;
    assert.ok(keySecret, 'RAZORPAY_KEY_SECRET must be set for this test');
    const signature = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.equal(verifyPaymentSignature({ orderId, paymentId, signature }), true);
  });

  it('rejects an invalid checkout signature', () => {
    assert.equal(
      verifyPaymentSignature({
        orderId: 'order_test123',
        paymentId: 'pay_test456',
        signature: '0'.repeat(64),
      }),
      false,
    );
  });

  it('accepts a valid webhook HMAC', () => {
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    assert.ok(webhookSecret, 'RAZORPAY_WEBHOOK_SECRET must be set for this test');
    const signature = createHmac('sha256', webhookSecret)
      .update(rawBody.toString('utf8'))
      .digest('hex');

    assert.equal(verifyWebhookSignature(rawBody, signature), true);
  });

  it('rejects a missing or invalid webhook HMAC', () => {
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    assert.equal(verifyWebhookSignature(rawBody, undefined), false);
    assert.equal(verifyWebhookSignature(rawBody, 'deadbeef'), false);
  });
});

describe('Razorpay webhook endpoint handler (POST /api/v1/payments/razorpay/webhook)', () => {
  it('rejects missing rawBody with 400 Bad Request', async () => {
    const { handleRazorpayWebhook } = await import('@routes/v1/webhooks.routes');
    const { ApiError } = await import('@utils/api-error');

    let capturedError: unknown = null;
    await handleRazorpayWebhook({ headers: {} } as any, {} as any, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError instanceof ApiError);
    assert.equal(capturedError.statusCode, 400);
    assert.equal(capturedError.message, 'Missing request body');
  });

  it('rejects an invalid webhook signature with 401 Unauthorized', async () => {
    const { handleRazorpayWebhook } = await import('@routes/v1/webhooks.routes');
    const { ApiError } = await import('@utils/api-error');

    let capturedError: unknown = null;
    const req = {
      headers: { 'x-razorpay-signature': 'invalid_signature_hex' },
      rawBody: Buffer.from(JSON.stringify({ event: 'payment.captured' })),
    };

    await handleRazorpayWebhook(req as any, {} as any, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError instanceof ApiError);
    assert.equal(capturedError.statusCode, 401);
    assert.equal(capturedError.message, 'Invalid webhook signature');
  });
});
