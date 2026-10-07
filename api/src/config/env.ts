import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// `.env` holds the one shared config (including the real production
// DATABASE_URL/CORS_ORIGIN) and is what deployment actually uses. `.env.local`
// is an optional, gitignored, developer-machine-only override on top of it —
// same precedence convention as website's Next.js config — so a value like
// CORS_ORIGIN=http://localhost:3000 for local browser testing never has to
// touch (or risk being deployed with) the shared file's production values.
// Tests must never pick up real provider credentials from a developer's env
// files — they configure everything they need in src/tests/setup-env.ts,
// which also sets SYSA_TEST_ISOLATION so this holds even if NODE_ENV is off.
if (process.env.NODE_ENV !== 'test' && process.env.SYSA_TEST_ISOLATION !== '1') {
  const explicitPort = process.env.PORT;
  const explicitBindHost = process.env.BIND_HOST;
  loadDotenv();
  loadDotenv({ path: '.env.local', override: true });
  if (explicitPort) {
    process.env.PORT = explicitPort;
  }
  if (explicitBindHost) {
    process.env.BIND_HOST = explicitBindHost;
  }
}

/**
 * Environment schema — the single source of truth for required runtime configuration.
 * Fails fast at boot (not at first use) if a required variable is missing/malformed,
 * per NFR-MAINT-02 (documentation/04-Non-Functional-Requirements.md).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Hostinger Node.js, Docker, and most PaaS inject PORT. Do not hardcode a
  // vendor-specific port. BIND_HOST defaults to all interfaces so the process
  // is reachable behind a reverse proxy; override with 127.0.0.1 only if a
  // host requires loopback-only bind.
  PORT: z.coerce.number().int().positive().default(4000),
  BIND_HOST: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : '0.0.0.0'),
    z.string().min(1),
  ),
  API_URL: z.string().url().default('http://localhost:4000'),
  WEB_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  COOKIE_DOMAIN: z.string().optional(),
  // Set to true only when the API is deployed on a different site than the
  // frontend (e.g. API at https://api.sysa.in, website at https://sysa.in) —
  // browsers refuse to send a `SameSite=Lax` cookie on cross-site requests at
  // all, so donor/admin login would silently stop working without this. Leave
  // unset when the website calls https://sysa.in/api/v1 (same-site proxy or
  // same-host Node). COOKIE_DOMAIN must also be left unset when this is true
  // — a `Domain=sysa.in` attribute on a Set-Cookie response from a different
  // registrable site is invalid and gets rejected by the browser outright.
  COOKIE_CROSS_SITE: z.coerce.boolean().default(false),

  // Account lockout & token TTL policy (documentation/12-Security-Requirements.md SEC-AUTH-04)
  ACCOUNT_LOCK_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCK_DURATION_MINUTES: z.coerce.number().int().positive().default(15),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),

  // CORS — comma-separated list of allowed origins (e.g. the bare domain and
  // its `www` variant both serving the site live, see app.ts). A single
  // value works too: it's just a one-element list.
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  // Cloudinary (media/document storage — see documentation/11-Technology-Stack.md)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Razorpay (payment gateway — see design/13-API-Architecture.md)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Email (transactional — donation receipts, notifications)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  // Spec alias for SMTP_USER — folded into it in validateEnv().
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  // Spec alias for SMTP_FROM — folded into it in validateEnv().
  SMTP_FROM_EMAIL: z.string().email().optional(),
  // Spec alias `SMTP_FROM`; `EMAIL_FROM` remains the historical name. Either
  // is accepted — SMTP_FROM wins when both are set.
  SMTP_FROM: z.string().email().optional(),
  EMAIL_FROM: z.string().email().default('no-reply@sysaindia.org'),
  // Recipient for "new newsletter subscriber" notifications — the Ashram's
  // real published contact address (same one already public on the site's
  // own Contact page), not a secret, so a plain default is fine here.
  NEWSLETTER_ADMIN_EMAIL: z.string().email().default('sysaorg1@gmail.com'),
  // Organisation copy of every verified donation receipt (receipt.service.ts
  // deliverOrgEmail). Same public contact address as above — not a secret.
  ORG_RECEIPT_EMAIL: z.string().email().default('sysaorg1@gmail.com'),
  // Post-payment notifications (email, WhatsApp, SMS). `dry_run` records each
  // channel as not sent without contacting any provider. Unset: dry_run in
  // development and whenever Razorpay is on a rzp_test_ key (test payments
  // must never message real donors); live otherwise. See notificationsMode().
  NOTIFICATIONS_MODE: z.enum(['live', 'dry_run']).optional(),

  // WhatsApp receipt delivery — MSG91 WhatsApp API is the primary provider
  // (whatsapp.service.ts). The same MSG91 authkey as SMS may be reused via
  // SMS_PROVIDER_API_KEY. All optional: donations still complete when
  // WhatsApp is unconfigured. Never expose these to the frontend.
  MSG91_WHATSAPP_AUTHKEY: z.string().optional(),
  MSG91_WHATSAPP_INTEGRATED_NUMBER: z.string().optional(),
  MSG91_WHATSAPP_TEMPLATE_NAME: z.string().optional(),
  MSG91_WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('en'),
  // Namespace of the approved sysa_general_update template (optional — MSG91
  // automatically resolves the template namespace from the integrated number
  // and template name unless explicitly specified).
  MSG91_WHATSAPP_TEMPLATE_NAMESPACE: z.string().optional(),
  MSG91_WHATSAPP_API_URL: z.string().url().optional(),
  // Optional JSON map of MSG91 component keys to receipt fields, e.g.
  // '{"body_1":"customerName","body_2":"amountFormatted","body_3":"receiptNumber"}'
  MSG91_WHATSAPP_TEMPLATE_VARS: z.string().optional(),
  // Spec aliases. MSG91_AUTHKEY is the single account authkey — it backs
  // WhatsApp and SMS unless their channel-specific keys are set.
  // MSG91_WHATSAPP_NUMBER aliases MSG91_WHATSAPP_INTEGRATED_NUMBER (any
  // "+91 94901 18877" formatting is stripped to digits before sending).
  // WABA_ID / TEMPLATE_ID are not part of the outbound send payload; they are
  // used by scripts/msg91-inspect-whatsapp-template.ts to verify the template.
  MSG91_AUTHKEY: z.string().optional(),
  MSG91_WHATSAPP_NUMBER: z.string().optional(),
  MSG91_WABA_ID: z.string().optional(),
  MSG91_WHATSAPP_TEMPLATE_ID: z.string().optional(),

  // Optional Meta Cloud API fallback when MSG91 WhatsApp is not configured.
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('en'),

  // SMS (donation receipt delivery — sms.service.ts, MSG91 Flow API). All
  // optional: the app boots and donations still complete fine with SMS
  // unconfigured, same fail-open pattern as SMTP above.
  // Defaults to MSG91's own Flow endpoint (api.msg91.com/api/v5/flow/) when
  // unset — only override for a different regional/enterprise MSG91 URL.
  SMS_PROVIDER_API_URL: z.string().url().optional(),
  SMS_PROVIDER_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  // MSG91's Flow API is DLT-templated only — this is the approved
  // template/flow id from the MSG91 dashboard; there is no freeform-message
  // fallback, so a send is only attempted once this is set.
  SMS_DLT_TEMPLATE_ID: z.string().optional(),
  // Optional JSON override of the template's variable names, e.g.
  // '{"donorName":"##name##","category":"##category##","amount":"##amount##"}'
  // — only needed if the DLT template wasn't built with MSG91's default
  // VAR1/VAR2/VAR3 naming.
  SMS_PROVIDER_TEMPLATE_VARS: z.string().optional(),
  // BSNL DLT Principal Entity ID for this organization (registered on the
  // BSNL DLT operator portal / MSG91's DLT dashboard). Record-keeping only —
  // MSG91's Flow API does not accept or require this value in send requests;
  // no code path reads this env var.
  SMS_DLT_PRINCIPAL_ENTITY_ID: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/** Pure parse of an env source (exported for tests): blank `KEY=` values
 * count as unset — otherwise an empty value would defeat `.default()`s, fail
 * `.email()`/`.url()` checks, and shadow aliases — then aliases are folded. */
export function parseEnv(source: NodeJS.ProcessEnv) {
  const raw = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
  const parsed = envSchema.safeParse(raw);
  return parsed.success
    ? { success: true as const, data: applyAliases(parsed.data) }
    : { success: false as const, error: parsed.error };
}

function validateEnv(): Env {
  const parsed = parseEnv(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

/** Folds the spec's env var names into the historical ones so the rest of
 * the codebase reads a single name. For SMTP/number aliases the historical
 * name wins when both are set. MSG91_AUTHKEY is the canonical secret and
 * always wins over the legacy per-channel key names, so a stale key left
 * under an old name can never shadow a freshly rotated one. */
function applyAliases(data: Env): Env {
  return {
    ...data,
    SMTP_USER: data.SMTP_USER ?? data.SMTP_USERNAME,
    SMTP_FROM: data.SMTP_FROM ?? data.SMTP_FROM_EMAIL,
    MSG91_WHATSAPP_AUTHKEY: data.MSG91_AUTHKEY ?? data.MSG91_WHATSAPP_AUTHKEY,
    MSG91_WHATSAPP_INTEGRATED_NUMBER:
      data.MSG91_WHATSAPP_INTEGRATED_NUMBER ?? data.MSG91_WHATSAPP_NUMBER,
    SMS_PROVIDER_API_KEY: data.MSG91_AUTHKEY ?? data.SMS_PROVIDER_API_KEY,
  };
}

export const env = validateEnv();

/** Resolved NOTIFICATIONS_MODE (see the schema comment). Tests default to
 * `live` because every provider there is a local stub behind the network
 * guard (src/tests/setup-env.ts). */
export function notificationsMode(source: Env = env): 'live' | 'dry_run' {
  if (source.NOTIFICATIONS_MODE) return source.NOTIFICATIONS_MODE;
  if (source.NODE_ENV === 'test') return 'live';
  if (source.NODE_ENV === 'development') return 'dry_run';
  return source.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ? 'dry_run' : 'live';
}

/** Transactional From address — SMTP_FROM aliases EMAIL_FROM for the spec. */
export const emailFromAddress = env.SMTP_FROM ?? env.EMAIL_FROM;
