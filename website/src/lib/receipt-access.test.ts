import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyReceiptError, isTerminalPollError, loadWithReceiptAccess } from './receipt-access';

/** The shape `publicApiClient`'s interceptor throws (ApiRequestError). */
function apiError(status?: number): Error & { status?: number } {
  return Object.assign(new Error('request failed'), { status });
}

describe('Receipt page access outcomes', () => {
  it('returns the receipt on success', async () => {
    const result = await loadWithReceiptAccess('token', async () => ({
      receiptNumber: 'RCPT-2026-000016',
    }));
    assert.deepEqual(result, { ok: true, data: { receiptNumber: 'RCPT-2026-000016' } });
  });

  it('reports a revoked or expired link (401) as an invalid link, never as "being prepared"', async () => {
    const result = await loadWithReceiptAccess('old-token', async () => {
      throw apiError(401);
    });
    assert.deepEqual(result, { ok: false, reason: 'link_invalid' });
    assert.equal(classifyReceiptError(apiError(403)), 'link_invalid');
  });

  it('reports a missing receipt (404) as not ready', async () => {
    assert.deepEqual(
      await loadWithReceiptAccess('token', async () => {
        throw apiError(404);
      }),
      { ok: false, reason: 'not_ready' },
    );
  });

  it('reports a non-completed payment (409) as not completed', () => {
    assert.equal(classifyReceiptError(apiError(409)), 'not_completed');
  });

  it('reports network failures, timeouts and server errors as unavailable', async () => {
    for (const error of [
      apiError(undefined),
      apiError(500),
      apiError(502),
      new Error('timeout of 15000ms exceeded'),
      'boom',
      null,
    ]) {
      assert.equal(classifyReceiptError(error), 'unavailable');
    }
    const timedOut = await loadWithReceiptAccess('token', () =>
      Promise.reject(apiError(undefined)),
    );
    assert.deepEqual(timedOut, { ok: false, reason: 'unavailable' });
  });

  it('never calls the API without a token (a receipt id alone authorizes nothing)', async () => {
    let called = false;
    const result = await loadWithReceiptAccess(undefined, async () => {
      called = true;
      return {};
    });
    assert.deepEqual(result, { ok: false, reason: 'link_invalid' });
    assert.equal(called, false);
  });

  it('always settles: a fetcher that never resolves is bounded by the client timeout, not by this helper', async () => {
    // The helper adds no waiting of its own: whatever the fetcher settles to
    // (axios rejects after its 15s timeout) becomes a terminal outcome.
    const result = await loadWithReceiptAccess('token', () => Promise.reject(new Error('timeout')));
    assert.equal(result.ok, false);
  });

  it('stops status polling on invalid links and missing donations, but not on transient errors', () => {
    assert.equal(isTerminalPollError(apiError(401)), true);
    assert.equal(isTerminalPollError(apiError(404)), true);
    assert.equal(isTerminalPollError(apiError(500)), false);
    assert.equal(isTerminalPollError(apiError(undefined)), false);
  });
});
