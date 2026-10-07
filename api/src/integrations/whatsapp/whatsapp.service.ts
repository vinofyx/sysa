import { env } from '@config/env';
import { logger } from '@lib/logger';
import { isValidIndianMobile, normalizeIndianMobile } from '@utils/mobile';
import { maskPhone } from '@utils/pii-mask';
import { redactSecrets } from '@utils/redact-secrets';

/** Mirrors `SmsDeliveryStatus` (schema.prisma) — kept as a separate string
 * union here rather than importing the generated Prisma enum, since this
 * integration module shouldn't depend on the ORM layer. */
export type WhatsAppSendStatus = 'sent' | 'failed' | 'not_configured';

/** @deprecated Use WhatsAppDeliveryResult.status */
export type WhatsAppSendResult = WhatsAppSendStatus;

export interface WhatsAppDeliveryResult {
  status: WhatsAppSendStatus;
  messageId?: string | null;
  failureReason?: string | null;
}

const DEFAULT_GRAPH_VERSION = 'v21.0';
const MSG91_WHATSAPP_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

const DEFAULT_MSG91_COMPONENT_MAP = {
  body_1: 'customerName',
  body_2: 'amountFormatted',
  body_3: 'receiptNumber',
} as const;

type ReceiptField =
  | 'customerName'
  | 'amountFormatted'
  | 'receiptNumber'
  | 'donationDate'
  | 'paymentId'
  | 'receiptUrl'
  | 'document';

const RECEIPT_FIELDS: ReadonlySet<string> = new Set<ReceiptField>([
  'customerName',
  'amountFormatted',
  'receiptNumber',
  'donationDate',
  'paymentId',
  'receiptUrl',
  'document',
]);

/** MSG91 component keys: `header_1`, `body_1..n`, `button_1..n`. */
const COMPONENT_KEY = /^(header|body|button)_[1-9]\d*$/;

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

interface Msg91WhatsAppResponse {
  status?: string;
  type?: string;
  hasError?: boolean;
  message?: string;
  request_id?: string;
  data?: { request_id?: string; message?: string };
  errors?: unknown;
}

export interface WhatsAppReceiptInput {
  to: string;
  customerName: string;
  amountFormatted: string;
  receiptNumber: string;
  donationDate: string;
  paymentId: string | null;
  documentUrl: string | null;
  filename: string;
}

/** Persisted as the channel's failure reason — secrets are scrubbed first. */
function truncateReason(rawReason: string, max = 500): string {
  const reason = redactSecrets(rawReason);
  return reason.length <= max ? reason : `${reason.slice(0, max - 1)}…`;
}

/** `91XXXXXXXXXX` — MSG91's recipient format. Accepts +91/91/0-prefixed and
 * bare 10-digit input; callers must check `isValidIndianMobile` first. */
export function toWhatsAppMobile(indianMobile: string): string {
  return `91${normalizeIndianMobile(indianMobile)}`;
}

export function isPublicHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function receiptCaption(): string {
  return 'Payment received successfully. PDF receipt is attached.';
}

function msg91AuthKey(): string | undefined {
  return env.MSG91_AUTHKEY || env.MSG91_WHATSAPP_AUTHKEY || env.SMS_PROVIDER_API_KEY;
}

let warnedDefaultComponentMap = false;

export type TemplateVarMapResult =
  { ok: true; map: Record<string, ReceiptField> } | { ok: false; error: string };

/** Validates MSG91_WHATSAPP_TEMPLATE_VARS. Errors name only the offending
 * keys/fields (config, never secrets or customer data). */
export function parseTemplateVarMap(raw: string): TemplateVarMapResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'MSG91_WHATSAPP_TEMPLATE_VARS is not valid JSON' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'MSG91_WHATSAPP_TEMPLATE_VARS must be a JSON object' };
  }

  const map: Record<string, ReceiptField> = {};
  const problems: string[] = [];
  for (const [component, field] of Object.entries(parsed)) {
    if (!COMPONENT_KEY.test(component)) problems.push(`unknown component "${component}"`);
    else if (typeof field !== 'string' || !RECEIPT_FIELDS.has(field)) {
      problems.push(`unknown field for "${component}"`);
    } else if (field === 'document' && component !== 'header_1') {
      problems.push(`"document" is only valid for header_1`);
    } else map[component] = field as ReceiptField;
  }
  if (problems.length > 0) {
    return { ok: false, error: `MSG91_WHATSAPP_TEMPLATE_VARS: ${problems.join('; ')}` };
  }
  if (Object.keys(map).length === 0) {
    return { ok: false, error: 'MSG91_WHATSAPP_TEMPLATE_VARS is empty' };
  }
  return { ok: true, map };
}

function msg91ComponentMap(): TemplateVarMapResult {
  if (env.MSG91_WHATSAPP_TEMPLATE_VARS === 'none' || env.MSG91_WHATSAPP_TEMPLATE_VARS === 'empty') {
    return { ok: true, map: {} };
  }
  if (!env.MSG91_WHATSAPP_TEMPLATE_VARS) {
    if (env.MSG91_WHATSAPP_TEMPLATE_NAME === 'sysa_general_update') {
      // The approved sysa_general_update template on MSG91 has no variables (variables: []).
      return { ok: true, map: {} };
    }
    // The default is a guess at the approved template's variable positions.
    // It should be pinned via scripts/msg91-inspect-whatsapp-template.ts.
    if (!warnedDefaultComponentMap) {
      warnedDefaultComponentMap = true;
      logger.warn(
        'MSG91_WHATSAPP_TEMPLATE_VARS is not set — using default body_1..3 mapping. Verify it with scripts/msg91-inspect-whatsapp-template.ts',
      );
    }
    return { ok: true, map: { ...DEFAULT_MSG91_COMPONENT_MAP } };
  }
  // A configured-but-invalid map fails the channel rather than silently
  // falling back to the guess.
  return parseTemplateVarMap(env.MSG91_WHATSAPP_TEMPLATE_VARS);
}

function fieldValue(input: WhatsAppReceiptInput, field: ReceiptField): string | null {
  switch (field) {
    case 'customerName':
      return input.customerName;
    case 'amountFormatted':
      return input.amountFormatted;
    case 'receiptNumber':
      return input.receiptNumber;
    case 'donationDate':
      return input.donationDate;
    case 'paymentId':
      return input.paymentId;
    case 'receiptUrl':
    case 'document':
      return input.documentUrl && isPublicHttpUrl(input.documentUrl) ? input.documentUrl : null;
    default:
      return null;
  }
}

export type Msg91PayloadResult =
  { ok: true; payload: ReturnType<typeof msg91Envelope> } | { ok: false; error: string };

/** Builds exactly the components the template map declares — no more, no
 * fewer — because MSG91 rejects a template send whose variables don't match
 * the approved template. A declared variable without a value fails the
 * channel up front with a clear reason. */
export function buildMsg91WhatsAppPayload(input: WhatsAppReceiptInput): Msg91PayloadResult {
  const mapResult = msg91ComponentMap();
  if (!mapResult.ok) return mapResult;

  const components: Record<string, Record<string, string>> = {};
  for (const [component, field] of Object.entries(mapResult.map)) {
    const value = fieldValue(input, field);
    if (!value) {
      return {
        ok: false,
        error:
          field === 'document' || field === 'receiptUrl'
            ? `Template ${component} needs a public receipt PDF URL, which is not available yet`
            : `Template ${component} needs ${field}, which is not available`,
      };
    }
    components[component] =
      field === 'document'
        ? { type: 'document', value, filename: input.filename }
        : { type: 'text', value };
  }

  return { ok: true, payload: msg91Envelope(input, components) };
}

function msg91Envelope(
  input: WhatsAppReceiptInput,
  components: Record<string, Record<string, string>>,
) {
  return {
    integrated_number: env.MSG91_WHATSAPP_INTEGRATED_NUMBER?.replace(/\D/g, ''),
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: env.MSG91_WHATSAPP_TEMPLATE_NAME,
        language: {
          code: env.MSG91_WHATSAPP_TEMPLATE_LANGUAGE,
          policy: 'deterministic',
        },
        ...(env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE
          ? { namespace: env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE }
          : {}),
        to_and_components: [
          {
            to: [toWhatsAppMobile(input.to)],
            components,
          },
        ],
      },
    },
  };
}

function msg91Configured(): boolean {
  return Boolean(
    msg91AuthKey() && env.MSG91_WHATSAPP_INTEGRATED_NUMBER && env.MSG91_WHATSAPP_TEMPLATE_NAME,
  );
}

function metaConfigured(): boolean {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

function isMsg91Success(status: number, body: Msg91WhatsAppResponse | null): boolean {
  if (!status || status >= 400) return false;
  if (!body) return false;
  if (body.hasError === true) return false;
  if (body.type === 'error' || body.status === 'error' || body.status === 'fail') return false;
  if (body.type === 'success' || body.status === 'success') return true;
  if (body.hasError === false) return true;
  if (body.request_id || body.data?.request_id) return true;
  return status >= 200 && status < 300;
}

function msg91MessageId(body: Msg91WhatsAppResponse | null): string | null {
  if (!body) return null;
  if (typeof body.request_id === 'string') return body.request_id;
  if (typeof body.data?.request_id === 'string') return body.data.request_id;
  if (typeof body.message === 'string' && body.type === 'success') return body.message;
  return null;
}

async function sendViaMsg91(input: WhatsAppReceiptInput): Promise<WhatsAppDeliveryResult> {
  const url = env.MSG91_WHATSAPP_API_URL ?? MSG91_WHATSAPP_URL;
  const built = buildMsg91WhatsAppPayload(input);
  if (!built.ok) {
    logger.error('WhatsApp not sent — template payload could not be built', {
      to: maskPhone(input.to),
      reason: built.error,
    });
    return { status: 'failed', failureReason: truncateReason(built.error) };
  }
  const payload = built.payload;

  logger.info('WhatsApp MSG91 request initiated', { to: maskPhone(input.to) });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authkey: msg91AuthKey() as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let body: Msg91WhatsAppResponse | null = null;
    try {
      body = (await response.json()) as Msg91WhatsAppResponse;
    } catch {
      logger.error('WhatsApp MSG91 returned a malformed (non-JSON) response', {
        to: maskPhone(input.to),
        httpStatus: response.status,
      });
      return {
        status: 'failed',
        failureReason: `MSG91 returned a non-JSON response (HTTP ${response.status})`,
      };
    }

    if (!isMsg91Success(response.status, body)) {
      const providerMessage =
        body?.message ||
        (typeof body?.data?.message === 'string' ? body.data.message : undefined) ||
        `MSG91 rejected the request (HTTP ${response.status})`;
      logger.error('WhatsApp MSG91 rejected the request', {
        to: maskPhone(input.to),
        httpStatus: response.status,
        providerType: body?.type,
        providerStatus: body?.status,
        providerMessage: body?.message,
      });
      return { status: 'failed', failureReason: truncateReason(providerMessage) };
    }

    const messageId = msg91MessageId(body);
    logger.info('WhatsApp accepted by MSG91', {
      to: maskPhone(input.to),
      httpStatus: response.status,
      providerRequestId: messageId,
    });
    return { status: 'sent', messageId };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const failureReason = isTimeout
      ? 'MSG91 WhatsApp request timed out'
      : error instanceof Error
        ? error.message
        : 'MSG91 WhatsApp send failed';
    logger.error(
      isTimeout ? 'WhatsApp MSG91 request timed out' : 'Failed to send WhatsApp via MSG91',
      {
        to: maskPhone(input.to),
        error: isTimeout ? undefined : error instanceof Error ? error.message : error,
      },
    );
    return { status: 'failed', failureReason: truncateReason(failureReason) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * WhatsApp receipt delivery. Prefers MSG91's approved WhatsApp template API
 * (never the SMS DLT template). Falls back to Meta Cloud API only when MSG91
 * WhatsApp is unconfigured but Cloud API credentials are present.
 *
 * No-ops with `not_configured` rather than throwing, so donations never fail
 * because WhatsApp isn't set up. `'sent'` is returned only after the provider
 * accepts the request.
 */
export async function sendWhatsAppReceipt(
  input: WhatsAppReceiptInput,
): Promise<WhatsAppDeliveryResult> {
  if (!isValidIndianMobile(input.to)) {
    logger.warn('WhatsApp not sent — recipient is not a valid Indian mobile', {
      to: maskPhone(input.to),
    });
    return { status: 'failed', failureReason: 'Recipient mobile number is invalid' };
  }

  if (msg91Configured()) {
    return sendViaMsg91(input);
  }

  if (metaConfigured()) {
    return sendViaMetaCloudApi(input);
  }

  const missing = [
    !msg91AuthKey() && 'MSG91_AUTHKEY (or MSG91_WHATSAPP_AUTHKEY / SMS_PROVIDER_API_KEY)',
    !env.MSG91_WHATSAPP_INTEGRATED_NUMBER &&
      'MSG91_WHATSAPP_NUMBER or MSG91_WHATSAPP_INTEGRATED_NUMBER',
    !env.MSG91_WHATSAPP_TEMPLATE_NAME && 'MSG91_WHATSAPP_TEMPLATE_NAME',
  ].filter((v): v is string => !!v);

  logger.warn('WhatsApp not sent — MSG91 WhatsApp is not fully configured', {
    to: maskPhone(input.to),
    missingEnvVars: missing,
  });
  return {
    status: 'not_configured',
    failureReason: `MSG91 WhatsApp is not configured (missing ${missing.join(', ')})`,
  };
}

async function sendViaMetaCloudApi(input: WhatsAppReceiptInput): Promise<WhatsAppDeliveryResult> {
  const version = env.WHATSAPP_API_VERSION || DEFAULT_GRAPH_VERSION;
  const url = `https://graph.facebook.com/${version}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = env.WHATSAPP_TEMPLATE_NAME
    ? buildMetaTemplatePayload(input)
    : buildMetaDocumentPayload(input);

  if (!env.WHATSAPP_TEMPLATE_NAME && !input.documentUrl) {
    return {
      status: 'failed',
      failureReason: 'WhatsApp Cloud API needs a public receipt PDF URL or an approved template',
    };
  }

  logger.info('WhatsApp Cloud API request initiated', { to: maskPhone(input.to) });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let body: (GraphErrorBody & { messages?: Array<{ id?: string }> }) | null = null;
    try {
      body = (await response.json()) as GraphErrorBody & { messages?: Array<{ id?: string }> };
    } catch {
      logger.error('WhatsApp provider returned a malformed (non-JSON) response', {
        to: maskPhone(input.to),
        httpStatus: response.status,
      });
      return {
        status: 'failed',
        failureReason: `WhatsApp Cloud API returned a non-JSON response (HTTP ${response.status})`,
      };
    }

    if (!response.ok || body?.error) {
      const providerMessage = body?.error?.message ?? `HTTP ${response.status}`;
      logger.error('WhatsApp provider rejected the request', {
        to: maskPhone(input.to),
        httpStatus: response.status,
        providerType: body?.error?.type,
        providerCode: body?.error?.code,
        providerSubcode: body?.error?.error_subcode,
        providerMessage: body?.error?.message,
      });
      return { status: 'failed', failureReason: truncateReason(providerMessage) };
    }

    const messageId = body?.messages?.[0]?.id ?? null;
    logger.info('WhatsApp accepted by provider', {
      to: maskPhone(input.to),
      httpStatus: response.status,
      providerRequestId: messageId,
    });
    return { status: 'sent', messageId };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const failureReason = isTimeout
      ? 'WhatsApp Cloud API request timed out'
      : error instanceof Error
        ? error.message
        : 'WhatsApp Cloud API send failed';
    logger.error(isTimeout ? 'WhatsApp provider request timed out' : 'Failed to send WhatsApp', {
      to: maskPhone(input.to),
      error: isTimeout ? undefined : error instanceof Error ? error.message : error,
    });
    return { status: 'failed', failureReason: truncateReason(failureReason) };
  } finally {
    clearTimeout(timeout);
  }
}

function buildMetaDocumentPayload(input: WhatsAppReceiptInput) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toWhatsAppMobile(input.to),
    type: 'document',
    document: {
      link: input.documentUrl,
      filename: input.filename,
      caption: receiptCaption(),
    },
  };
}

function buildMetaTemplatePayload(input: WhatsAppReceiptInput) {
  const header =
    input.documentUrl && isPublicHttpUrl(input.documentUrl)
      ? [
          {
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: {
                  link: input.documentUrl,
                  filename: input.filename,
                },
              },
            ],
          },
        ]
      : [];

  return {
    messaging_product: 'whatsapp',
    to: toWhatsAppMobile(input.to),
    type: 'template',
    template: {
      name: env.WHATSAPP_TEMPLATE_NAME,
      language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
      components: [
        ...header,
        {
          type: 'body',
          parameters: [
            { type: 'text', text: input.customerName },
            { type: 'text', text: input.amountFormatted },
          ],
        },
      ],
    },
  };
}
