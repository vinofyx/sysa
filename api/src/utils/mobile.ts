/** Bare 10-digit Indian mobile numbers, no country code — matches the
 * storage format already used by seed data (e.g. `CommitteeMember.mobile`). */
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Strips formatting and a leading `+91`/`91` country code so the same
 * donor's number normalizes identically regardless of how they typed it. */
export function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidIndianMobile(raw: string): boolean {
  return INDIAN_MOBILE_REGEX.test(normalizeIndianMobile(raw));
}
