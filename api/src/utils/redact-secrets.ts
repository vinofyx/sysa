import { env, type Env } from '@config/env';

/** Every configured credential. Their actual values are scrubbed from logs
 * and from persisted provider error text, so a provider that echoes a
 * request (or an exception that embeds a header) can never leak a secret. */
const SECRET_KEYS: ReadonlyArray<keyof Env> = [
  'MSG91_AUTHKEY',
  'MSG91_WHATSAPP_AUTHKEY',
  'SMS_PROVIDER_API_KEY',
  'SMTP_PASSWORD',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'CLOUDINARY_API_SECRET',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

let cachedSecrets: string[] | null = null;

function secretValues(): string[] {
  if (cachedSecrets) return cachedSecrets;
  const values = SECRET_KEYS.map((key) => env[key]).filter(
    (value): value is string => typeof value === 'string' && value.length >= 6,
  );
  // Longest first so a secret that contains another is fully replaced.
  cachedSecrets = [...new Set(values)].sort((a, b) => b.length - a.length);
  return cachedSecrets;
}

/** Full identity numbers are never stored (only masked last-4 forms), but
 * they do pass through the initiate request — so anything shaped like a full
 * PAN (ABCDE1234F) or a 12-digit Aadhaar (1234 5678 9012) is scrubbed too.
 * Over-matching (e.g. a 12-digit 91XXXXXXXXXX mobile) only hides more. */
const FULL_PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
const FULL_AADHAAR = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g;

export function redactIdentityNumbers(text: string): string {
  return text.replace(FULL_PAN, '[PAN REDACTED]').replace(FULL_AADHAAR, '[AADHAAR REDACTED]');
}

export function redactSecrets(text: string): string {
  let out = text;
  for (const secret of secretValues()) {
    if (out.includes(secret)) out = out.split(secret).join(REDACTED);
  }
  return redactIdentityNumbers(out);
}

/** Redacts string leaves of plain objects/arrays in place-safe copies. */
export function redactDeep<T>(value: T, depth = 0): T {
  if (typeof value === 'string') return redactSecrets(value) as T;
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, depth + 1)) as T;
  if (value instanceof Error) {
    const copy = new Error(redactSecrets(value.message));
    copy.name = value.name;
    if (value.stack) copy.stack = redactSecrets(value.stack);
    return copy as T;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) out[key] = redactDeep(item, depth + 1);
  return out as T;
}
