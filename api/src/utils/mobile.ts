/** Bare 10-digit Indian mobile numbers, no country code — matches the
 * storage format already used by seed data (e.g. `CommitteeMember.mobile`). */
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Strips formatting and a leading `+91`/`91`/`0091`/`0` country code so the same
 * donor's number normalizes identically regardless of how they typed it. */
export function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 14 && digits.startsWith('0091')) return digits.slice(4);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidIndianMobile(raw: string): boolean {
  return INDIAN_MOBILE_REGEX.test(normalizeIndianMobile(raw));
}

/** E.164 format with +91 prefix (e.g. "+919490118877"). */
export function formatE164IndianMobile(raw: string): string {
  return `+91${normalizeIndianMobile(raw)}`;
}

/** Human-readable formatted Indian mobile (e.g. "+91 94901 18877"). */
export function formatIndianMobile(raw: string): string {
  const norm = normalizeIndianMobile(raw);
  if (norm.length !== 10) return raw;
  return `+91 ${norm.slice(0, 5)} ${norm.slice(5)}`;
}
