/**
 * Where the donor goes when the payment-verification request fails.
 *
 * Only a definitive rejection by the API (invalid signature, payment not
 * captured, unknown donation, payment already used) means the payment did not
 * complete. A timeout, network error, rate limit or server error says nothing
 * about the payment itself — Razorpay may well have captured it, and the
 * webhook completes the donation independently — so the donor is sent to the
 * status page, which shows only what the API reports (paid / pending with
 * polling / failed) and never claims success on its own.
 */
const DEFINITIVE_REJECTIONS: ReadonlySet<number> = new Set([400, 401, 403, 404, 409, 422]);

export type VerifyFailureDestination = 'failure' | 'status';

export function verifyFailureDestination(error: unknown): VerifyFailureDestination {
  const status =
    error && typeof error === 'object' && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined;
  return typeof status === 'number' && DEFINITIVE_REJECTIONS.has(status) ? 'failure' : 'status';
}

/** Verification waits for receipt issuance (PDF + delivery attempts), which
 * can legitimately take longer than the default 15 s request timeout. */
export const VERIFY_PAYMENT_TIMEOUT_MS = 90_000;
