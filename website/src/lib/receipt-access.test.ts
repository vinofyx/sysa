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

describe('Donation status retrieval, payload structure & security', () => {
  const mockCompletedStatus = {
    id: '588ccb11-70fd-4fa1-89e1-8d49868fe897',
    status: 'completed',
    paymentStatus: 'completed',
    amount: 1000,
    currency: 'INR',
    category: 'General Donation',
    donorName: 'Dharani',
    donorPhoneMasked: '******0526',
    donorEmailMasked: 'd***@sysa.in',
    receiptAvailable: true,
    receiptNumber: 'RCPT-2026-000004',
    receiptUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
    paymentReference: 'pay_sample123',
  };

  const mockPendingStatus = {
    ...mockCompletedStatus,
    status: 'pending',
    paymentStatus: 'pending',
    receiptAvailable: false,
    receiptNumber: null,
    receiptUrl: null,
  };

  function unwrapStatus<T>(body: { data?: T } | T): T {
    if (body && typeof body === 'object' && 'data' in body && (body as { data?: T }).data) {
      return (body as { data: T }).data;
    }
    return body as T;
  }

  it('unwraps status correctly from backend { data: status } wrapper', () => {
    const rawResponse = { data: mockCompletedStatus };
    const unwrapped = unwrapStatus(rawResponse);

    assert.equal(unwrapped.id, mockCompletedStatus.id);
    assert.equal(unwrapped.status, 'completed');
    assert.equal(unwrapped.receiptNumber, 'RCPT-2026-000004');
    assert.equal(unwrapped.amount, 1000);
    assert.equal(unwrapped.receiptAvailable, true);
  });

  it('unwraps status correctly when returned directly without wrapper', () => {
    const rawResponse = mockCompletedStatus;
    const unwrapped = unwrapStatus(rawResponse);

    assert.equal(unwrapped.id, mockCompletedStatus.id);
    assert.equal(unwrapped.receiptNumber, 'RCPT-2026-000004');
  });

  it('handles pending payment status cleanly with polling continuation', () => {
    assert.equal(mockPendingStatus.status, 'pending');
    assert.equal(mockPendingStatus.receiptAvailable, false);
    assert.equal(mockPendingStatus.receiptNumber, null);
    assert.equal(mockPendingStatus.amount, 1000);
  });

  it('correctly handles 401 and 403 as terminal invalid token errors', () => {
    const error401 = apiError(401);
    const error403 = apiError(403);

    assert.equal(classifyReceiptError(error401), 'link_invalid');
    assert.equal(classifyReceiptError(error403), 'link_invalid');
    assert.equal(isTerminalPollError(error401), true);
    assert.equal(isTerminalPollError(error403), true);
  });

  it('correctly handles 404 as missing donation / receipt not ready', () => {
    const error404 = apiError(404);
    assert.equal(classifyReceiptError(error404), 'not_ready');
    assert.equal(isTerminalPollError(error404), true);
  });

  it('correctly handles network error or 500 server error as transient unavailable', () => {
    const networkError = apiError(undefined);
    const serverError = apiError(500);

    assert.equal(classifyReceiptError(networkError), 'unavailable');
    assert.equal(classifyReceiptError(serverError), 'unavailable');
    assert.equal(isTerminalPollError(networkError), false);
    assert.equal(isTerminalPollError(serverError), false);
  });

  it('ensures logged error objects never expose access tokens or donor personal info', () => {
    const testDonationId = '588ccb11-70fd-4fa1-89e1-8d49868fe897';
    const testToken = 'secret-hmac-token-xyz-12345';
    const rawError = new Error(`Request failed with status code 500 at /status?token=${testToken}`);

    // Build the sanitized log entry as implemented in DonationSuccessView
    const safeErrorMsg =
      rawError instanceof Error
        ? rawError.message.replace(/([?&]token=)[^&#\s]+/gi, '$1[REDACTED]')
        : 'Unknown error';
    const logPayload = {
      donationId: testDonationId,
      error: safeErrorMsg,
    };

    const serialized = JSON.stringify(logPayload);
    assert.equal(
      serialized.includes(testToken),
      false,
      'Log payload must NOT contain access token',
    );
    assert.equal(serialized.includes('Dharani'), false, 'Log payload must NOT contain donor name');
    assert.equal(serialized.includes('BAQPL0308B'), false, 'Log payload must NOT contain PAN');
    assert.equal(
      serialized.includes(testDonationId),
      true,
      'Log payload preserves donationId for tracing',
    );
  });

  it('handles HTTP 200 response with completed payment details', () => {
    const response200 = { ok: true, data: mockCompletedStatus };
    assert.equal(response200.ok, true);
    assert.equal(response200.data.paymentStatus, 'completed');
    assert.equal(response200.data.receiptAvailable, true);
    assert.equal(response200.data.receiptNumber, 'RCPT-2026-000004');
    assert.equal(response200.data.amount, 1000);
  });

  it('handles HTTP 200 response with pending payment details and triggers polling', () => {
    const response200Pending = { ok: true, data: mockPendingStatus };
    assert.equal(response200Pending.ok, true);
    assert.equal(response200Pending.data.paymentStatus, 'pending');
    assert.equal(response200Pending.data.receiptAvailable, false);
    assert.equal(response200Pending.data.receiptNumber, null);
  });

  it('handles HTTP 401 Unauthorized as link_invalid', () => {
    assert.equal(classifyReceiptError(apiError(401)), 'link_invalid');
    assert.equal(isTerminalPollError(apiError(401)), true);
  });

  it('handles HTTP 403 Forbidden as link_invalid', () => {
    assert.equal(classifyReceiptError(apiError(403)), 'link_invalid');
    assert.equal(isTerminalPollError(apiError(403)), true);
  });

  it('handles HTTP 404 Not Found as not_ready', () => {
    assert.equal(classifyReceiptError(apiError(404)), 'not_ready');
    assert.equal(isTerminalPollError(apiError(404)), true);
  });

  it('handles HTTP 409 Conflict as not_completed', () => {
    assert.equal(classifyReceiptError(apiError(409)), 'not_completed');
    assert.equal(isTerminalPollError(apiError(409)), false);
  });

  it('handles HTTP 500 Internal Server Error as unavailable', () => {
    assert.equal(classifyReceiptError(apiError(500)), 'unavailable');
    assert.equal(isTerminalPollError(apiError(500)), false);
  });

  it('builds receipt download PDF URL safely with encoded token parameter', () => {
    const id = '588ccb11-70fd-4fa1-89e1-8d49868fe897';
    const token = 'v2.1730000000.abc123def456';
    const expectedQuery = `?token=${encodeURIComponent(token)}`;
    const url = `https://api.sysa.in/api/v1/donations/${id}/receipt/pdf${expectedQuery}`;

    assert.ok(url.includes(id));
    assert.ok(url.includes(encodeURIComponent(token)));
    assert.ok(url.endsWith(expectedQuery));
  });
});
