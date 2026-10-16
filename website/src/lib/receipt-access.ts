/**
 * Turns a receipt/status fetch into an explicit outcome, so a page never
 * shows "being prepared" for what is really an expired link or an outage.
 * Dependency-free (no axios/env) so it can be unit-tested directly.
 */

/** Why a receipt could not be shown. */
export type ReceiptAccessFailure =
  /** 401/403: link expired, revoked, or for another donation. */
  | 'link_invalid'
  /** 404: no receipt (yet) for this donation. */
  | 'not_ready'
  /** 409, or a non-completed payment: there is no receipt to give. */
  | 'not_completed'
  /** Network error, timeout, or 5xx: try again later. */
  | 'unavailable';

export type ReceiptAccessResult<T> =
  { ok: true; data: T } | { ok: false; reason: ReceiptAccessFailure };

/** HTTP status from an `ApiRequestError` (or any error carrying `status`). */
function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

export function classifyReceiptError(error: unknown): ReceiptAccessFailure {
  const status = statusOf(error);
  if (status === 401 || status === 403) return 'link_invalid';
  if (status === 404) return 'not_ready';
  if (status === 409) return 'not_completed';
  return 'unavailable';
}

/**
 * Runs `fetcher` and always settles: a result, or a classified failure.
 * Without a token there is nothing that could authorize the request (the page
 * renders on the server, so no donor cookie is forwarded) — reported as an
 * invalid link rather than sent.
 */
export async function loadWithReceiptAccess<T>(
  token: string | undefined,
  fetcher: (token: string) => Promise<T>,
): Promise<ReceiptAccessResult<T>> {
  if (!token) return { ok: false, reason: 'link_invalid' };
  try {
    return { ok: true, data: await fetcher(token) };
  } catch (error) {
    return { ok: false, reason: classifyReceiptError(error) };
  }
}

/** The status poller stops on these: retrying cannot change the answer. */
export function isTerminalPollError(error: unknown): boolean {
  const reason = classifyReceiptError(error);
  return reason === 'link_invalid' || reason === 'not_ready';
}
