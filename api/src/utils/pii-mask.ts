/** Masks all but the last 4 characters of an identity document number — the
 * raw value is never stored, only this masked form (donation-checkout.service.ts). */
function maskLast4(value: string): string {
  return `${'*'.repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
}

export function maskPan(pan: string): string {
  return maskLast4(pan);
}

export function maskAadhaar(aadhaar: string): string {
  return maskLast4(aadhaar);
}

/** Same convention for phone numbers in logs — never write a donor's full
 * mobile number to application logs (delivery_logging.never_log). */
export function maskPhone(phone: string): string {
  return maskLast4(phone);
}

/** Masks the local-part of an email so logs can still be diagnosed without
 * writing a donor's full address. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return maskLast4(email);
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, Math.min(1, local.length));
  return `${visible}***@${domain}`;
}
