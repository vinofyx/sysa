import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { verifyFailureDestination } from './payment-outcome';

class FakeApiError extends Error {
  constructor(readonly status?: number) {
    super('x');
  }
}

describe('verifyFailureDestination', () => {
  it('definitive API rejections (bad signature, not captured, reused payment) go to the failure page', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      assert.equal(verifyFailureDestination(new FakeApiError(status)), 'failure', String(status));
    }
  });

  it('timeouts, network errors, rate limits and server errors go to the status page, never failure', () => {
    for (const error of [
      new FakeApiError(undefined), // axios timeout / network error: no HTTP status
      new FakeApiError(429),
      new FakeApiError(500),
      new FakeApiError(502),
      new FakeApiError(503),
      new FakeApiError(504),
      new Error('ECONNABORTED'),
      'weird',
      undefined,
    ]) {
      assert.equal(verifyFailureDestination(error), 'status');
    }
  });
});
