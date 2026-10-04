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
