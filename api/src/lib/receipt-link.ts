import { env } from '@config/env';
import { signReceiptAccessToken } from '@lib/donor-jwt';
import { logger } from '@lib/logger';

export interface ReceiptLinkConfig {
  /** Public origin the API is reached at (API_URL), e.g. https://sysa.in. */
  apiUrl: string;
  nodeEnv: string;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

/**
 * "Download Receipt" link for emails: the authenticated PDF endpoint
 * (GET /api/v1/donations/:id/receipt/pdf), which renders the receipt from its
 * stored record — never a stored file URL, which would freeze the layout.
 *
 * Carries a time-limited receipt access token (signReceiptAccessToken, 30
 * days), accepted by the endpoint's existing access check alongside the
 * donor/admin sessions. Built on API_URL with the same `/api/v1` convention
 * as the website's NEXT_PUBLIC_API_URL; the id and token are URL-encoded.
 *
 * Returns null (the email then carries the PDF attachment only) when a
 * production deployment's API_URL is not publicly reachable — a localhost
 * link in a real donor's inbox would never work.
 */
export function buildReceiptDownloadUrl(
  donationId: string,
  config: ReceiptLinkConfig = { apiUrl: env.API_URL, nodeEnv: env.NODE_ENV },
): string | null {
  let base: URL;
  try {
    base = new URL(config.apiUrl.endsWith('/') ? config.apiUrl : `${config.apiUrl}/`);
  } catch {
    logger.warn('Receipt download link omitted — API_URL is not a valid URL');
    return null;
  }
  if (
    config.nodeEnv === 'production' &&
    (isLoopback(base.hostname) || base.protocol !== 'https:')
  ) {
    logger.warn('Receipt download link omitted — API_URL is not a public https origin', {
      apiOrigin: base.origin,
    });
    return null;
  }

  const url = new URL(`api/v1/donations/${encodeURIComponent(donationId)}/receipt/pdf`, base);
  url.searchParams.set('token', signReceiptAccessToken(donationId));
  return url.toString();
}
