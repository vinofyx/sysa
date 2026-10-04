import { env } from '@config/env';
import { logger } from '@lib/logger';
import { maskPhone } from '@utils/pii-mask';

/** Mirrors `SmsDeliveryStatus` (schema.prisma) — kept as a separate string
 * union here rather than importing the generated Prisma enum, since this
 * integration module shouldn't depend on the ORM layer. `'not_configured'`
 * and `'failed'` are both non-throwing outcomes; callers that only care
 * about "should I tell the donor this worked" can treat anything other than
 * `'sent'` as not-delivered. */
export type SmsSendResult = 'sent' | 'failed' | 'not_configured';

/** MSG91's Flow (DLT-templated) API doesn't accept a freeform message — the
 * actual text lives server-side as an already-DLT-approved template, and a
 * send only supplies the template's declared variables per recipient. These
 * three map to the required receipt message
 * ("Dear Sri [Name] Garu, ... towards [Category] of ₹[Amount] ..."). */
export interface ReceiptSmsVariables {
  donorName: string;
  category: string;
  amount: string;
}

/** MSG91's own default naming for Flow template variables (confirmed
 * against MSG91's docs/examples — a template built any other way in the
 * dashboard would use different names, in which case override via
 * SMS_PROVIDER_TEMPLATE_VARS, see below). */
const DEFAULT_VAR_NAMES = { donorName: 'VAR1', category: 'VAR2', amount: 'VAR3' } as const;

function templateVarNames(): typeof DEFAULT_VAR_NAMES {
  if (!env.SMS_PROVIDER_TEMPLATE_VARS) return DEFAULT_VAR_NAMES;
  try {
    const parsed = JSON.parse(env.SMS_PROVIDER_TEMPLATE_VARS) as Partial<typeof DEFAULT_VAR_NAMES>;
    return { ...DEFAULT_VAR_NAMES, ...parsed };
  } catch {
    logger.warn('SMS_PROVIDER_TEMPLATE_VARS is set but not valid JSON — using MSG91 defaults');
    return DEFAULT_VAR_NAMES;
  }
}

/** MSG91 always replies HTTP 200, even for a rejected request — the real
 * outcome is only in the body's `type` field (verified live against
 * api.msg91.com/api/v5/flow/: an empty/invalid request still comes back 200
 * with `{"type":"error","message":"..."}`). Relying on `response.ok` alone
 * would silently report a hard rejection as `'sent'`. */
interface Msg91FlowResponse {
  type?: string;
  message?: string;
}

const MSG91_FLOW_URL = 'https://api.msg91.com/api/v5/flow/';

/** Bare 10-digit Indian mobile (this app's stored `Donor.phone` format) →
 * the `91XXXXXXXXXX` shape MSG91's Flow API requires (verified against
 * MSG91's own documented example payloads) — never `+91`, never a leading
 * `0`. Only touches the copy sent to MSG91; `Donor.phone` itself is
 * untouched (donor-resolution.service.ts still owns that format). */
function toMsg91Mobile(bareIndianMobile: string): string {
  return `91${bareIndianMobile}`;
}

/**
 * MSG91 Flow (DLT-templated) SMS integration — the receipt-SMS entry point
 * every caller (issueReceipt, retryReceiptSms) uses. No-ops with a warning
 * when unconfigured rather than throwing, so donations/receipts never fail
 * because SMS isn't set up; a send failure is logged, not raised, so it
 * never blocks the caller's business logic either.
 */
export async function sendSms(to: string, variables: ReceiptSmsVariables): Promise<SmsSendResult> {
  const missing = [
    !env.SMS_PROVIDER_API_KEY && 'SMS_PROVIDER_API_KEY',
    !env.SMS_SENDER_ID && 'SMS_SENDER_ID',
    !env.SMS_DLT_TEMPLATE_ID && 'SMS_DLT_TEMPLATE_ID',
  ].filter((v): v is string => !!v);

  if (missing.length > 0) {
    // Report exactly which var(s) are absent — never their values — so this
    // is diagnosable from logs alone instead of guessing at the cause.
    // SMS_DLT_TEMPLATE_ID is required here (unlike the old generic
    // abstraction): MSG91's Flow API rejects every request without one —
    // there is no freeform-text fallback for a DLT-templated route.
    logger.warn('SMS not sent — MSG91 not fully configured', {
      to: maskPhone(to),
      missingEnvVars: missing,
    });
    return 'not_configured';
  }

  const url = env.SMS_PROVIDER_API_URL ?? MSG91_FLOW_URL;
  const vars = templateVarNames();

  logger.info('SMS provider request initiated', { to: maskPhone(to) });

  // A hung provider connection must never hang receipt issuance — 10s is
  // generous for a REST SMS gateway's own typical timeout budget.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: env.SMS_PROVIDER_API_KEY as string,
      },
      body: JSON.stringify({
        template_id: env.SMS_DLT_TEMPLATE_ID,
        sender: env.SMS_SENDER_ID,
        short_url: 0,
        recipients: [
          {
            mobiles: toMsg91Mobile(to),
            [vars.donorName]: variables.donorName,
            [vars.category]: variables.category,
            [vars.amount]: variables.amount,
          },
        ],
      }),
      signal: controller.signal,
    });

    let body: Msg91FlowResponse | null = null;
    try {
      body = (await response.json()) as Msg91FlowResponse;
    } catch {
      // Malformed/non-JSON response — never let a parse failure crash the
      // caller; just treat it as an undeterminable outcome.
      logger.error('SMS provider returned a malformed (non-JSON) response', {
        to: maskPhone(to),
        httpStatus: response.status,
      });
      return 'failed';
    }

    if (!response.ok || body?.type !== 'success') {
      // MSG91's `message` field on error is a short, provider-authored
      // description (e.g. "invalid template id", "Sender id not approved",
      // "authentication failed", "low balance") — never an echo of request
      // data or the auth key, safe to log for diagnosis.
      logger.error('SMS provider rejected the request', {
        to: maskPhone(to),
        httpStatus: response.status,
        providerType: body?.type,
        providerMessage: body?.message,
      });
      return 'failed';
    }

    logger.info('SMS accepted by provider', {
      to: maskPhone(to),
      httpStatus: response.status,
      providerRequestId: body.message,
    });
    return 'sent';
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    logger.error(isTimeout ? 'SMS provider request timed out' : 'Failed to send SMS', {
      to: maskPhone(to),
      error: isTimeout ? undefined : error instanceof Error ? error.message : error,
    });
    return 'failed';
  } finally {
    clearTimeout(timeout);
  }
}
