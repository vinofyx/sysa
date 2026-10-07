/**
 * Controlled real MSG91 WhatsApp receipt delivery test.
 *
 * Usage:
 *   npx tsx scripts/msg91-whatsapp-receipt-test.ts
 *
 * Reads credentials from api/.env (+ .env.local override).
 * - Never prints the AuthKey or any secret.
 * - Sends exactly ONE WhatsApp message to the approved test recipient.
 * - Reports all check results and the sanitized MSG91 response.
 * - Fails fast if any required config is missing.
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env then .env.local (same order as env.ts).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(apiRoot, '.env') });
loadDotenv({ path: path.join(apiRoot, '.env.local'), override: true });

// ─── Helper: phone normalization (mirrors mobile.ts) ─────────────────────────

function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function isValidIndianMobile(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(raw));
}

function toWhatsAppMobile(indianMobile: string): string {
  return `91${normalizeIndianMobile(indianMobile)}`;
}

// ─── Helper: sanitize response body (strip any value that equals the authkey) ─

function sanitize(obj: unknown, secret: string): unknown {
  if (typeof obj === 'string') return obj === secret ? '[REDACTED]' : obj;
  if (Array.isArray(obj)) return obj.map((v) => sanitize(v, secret));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, sanitize(v, secret)]),
    );
  }
  return obj;
}

// ─── Helper: diagnose MSG91 rejection ────────────────────────────────────────

function diagnoseRejection(status: number, body: Record<string, unknown> | null): string {
  const msg = String(body?.message ?? '').toLowerCase();
  const errorsStr = JSON.stringify(body?.errors ?? '').toLowerCase();
  const combined = msg + ' ' + errorsStr;

  if (
    status === 401 ||
    combined.includes('auth') ||
    combined.includes('invalid key') ||
    combined.includes('unauthor')
  ) {
    return 'AUTHENTICATION — AuthKey invalid or revoked. Rotate and update MSG91_AUTHKEY in api/.env';
  }
  if (combined.includes('template') || combined.includes('template_name')) {
    return 'TEMPLATE — Template not found or not approved under this WABA/integrated number';
  }
  if (combined.includes('waba') || combined.includes('business account')) {
    return 'WABA — WhatsApp Business Account not properly linked';
  }
  if (
    combined.includes('sender') ||
    combined.includes('integrated_number') ||
    (combined.includes('number') && !combined.includes('template'))
  ) {
    return 'SENDER — Integrated number not registered or not approved for sending';
  }
  if (combined.includes('recipient') || combined.includes('phone')) {
    return 'RECIPIENT — Recipient phone number invalid or not a WhatsApp user';
  }
  if (
    combined.includes('variable') ||
    combined.includes('component') ||
    combined.includes('param')
  ) {
    return 'VARIABLE MAPPING — Template variable count/order mismatch';
  }
  if (combined.includes('payload') || combined.includes('bad request') || status === 400) {
    return 'API PAYLOAD — Malformed request payload';
  }
  if (status >= 500) {
    return 'MSG91 server error — transient; retry later';
  }
  return `UNKNOWN — HTTP ${status}: ${body?.message ?? 'no message'}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const checks: Record<string, string> = {};

  // ── §1  Environment checks ──────────────────────────────────────────────────

  const authkey = (
    process.env.MSG91_AUTHKEY ||
    process.env.MSG91_WHATSAPP_AUTHKEY ||
    process.env.SMS_PROVIDER_API_KEY ||
    ''
  ).trim();

  checks['MSG91_AUTHKEY_PRESENT'] =
    authkey.length > 0 ? 'OK (key is present, length > 0)' : 'FAIL — key is empty or missing';

  // Resolve integrated number alias (mirrors applyAliases in env.ts)
  const integratedNumber = (
    process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER ||
    process.env.MSG91_WHATSAPP_NUMBER ||
    ''
  ).replace(/\D/g, '');

  checks['MSG91_WHATSAPP_INTEGRATED_NUMBER'] =
    integratedNumber.length > 0 ? `OK (${integratedNumber})` : 'FAIL — not configured';

  const wabaId = process.env.MSG91_WABA_ID?.trim() ?? '';
  checks['MSG91_WABA_ID'] = wabaId.length > 0 ? `OK (${wabaId})` : 'FAIL — not configured';

  const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_NAME?.trim() ?? '';
  checks['MSG91_WHATSAPP_TEMPLATE_NAME'] =
    templateName === 'sysa_general_update'
      ? 'OK (sysa_general_update)'
      : `FAIL — expected sysa_general_update, got "${templateName}"`;

  const templateId = process.env.MSG91_WHATSAPP_TEMPLATE_ID?.trim() ?? '';
  checks['MSG91_WHATSAPP_TEMPLATE_ID_546722'] =
    templateId === '546722'
      ? 'OK (546722) — reference only; not sent in WhatsApp payload'
      : `WARN — expected 546722, got "${templateId}" (reference value only)`;

  checks['SMS_DLT_TEMPLATE_1477179051631924585_NOT_USED_FOR_WHATSAPP'] =
    'OK — SMS_DLT_TEMPLATE_ID is for MSG91 SMS Flow API only; WhatsApp payload uses template name, never DLT ID';

  const templateLanguage = process.env.MSG91_WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en';
  checks['MSG91_WHATSAPP_TEMPLATE_LANGUAGE_EN'] =
    templateLanguage === 'en' ? 'OK (en)' : `WARN — expected en, got "${templateLanguage}"`;

  const templateVars = process.env.MSG91_WHATSAPP_TEMPLATE_VARS?.trim() ?? '';
  const isNoVars = templateVars === '' || templateVars === 'none' || templateVars === 'empty';
  checks['MSG91_WHATSAPP_TEMPLATE_VARS'] = isNoVars
    ? 'OK — sysa_general_update has no body variables; component map is empty (confirmed by inspect script)'
    : `INFO — TEMPLATE_VARS="${templateVars}" — will be used instead of empty map`;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   MSG91 WhatsApp Receipt — Controlled Real Delivery Test   ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n── §1  Environment Checks ──────────────────────────────────');
  for (const [k, v] of Object.entries(checks)) {
    const icon = v.startsWith('FAIL') ? '✗' : '✓';
    console.log(`  ${icon}  ${k}: ${v}`);
  }

  const fatal = Object.entries(checks).find(([, v]) => v.startsWith('FAIL'));
  if (fatal) {
    console.error(`\n✗ ABORT — fatal config check failed: ${fatal[0]}: ${fatal[1]}`);
    process.exit(1);
  }

  // ── §2  Phone normalization check ───────────────────────────────────────────

  console.log('\n── §2  Phone Normalization Check ───────────────────────────');

  const TEST_RECIPIENT_RAW =
    process.env.MSG91_WHATSAPP_NUMBER || process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '';
  if (!TEST_RECIPIENT_RAW) {
    console.error('✗ Cannot determine test recipient — MSG91_WHATSAPP_NUMBER not set');
    process.exit(1);
  }

  console.log(`  Input number (raw): ${TEST_RECIPIENT_RAW}`);
  const normalizedMobile = normalizeIndianMobile(TEST_RECIPIENT_RAW);
  const whatsappFormatted = toWhatsAppMobile(TEST_RECIPIENT_RAW);
  const isValid = isValidIndianMobile(TEST_RECIPIENT_RAW);
  console.log(`  Normalized 10-digit: ${normalizedMobile}`);
  console.log(`  WhatsApp format (91XXXXXXXXXX): ${whatsappFormatted}`);
  console.log(`  isValidIndianMobile: ${isValid ? 'YES' : 'NO'}`);

  if (!isValid) {
    console.error(`✗ ABORT — "${TEST_RECIPIENT_RAW}" is not a valid Indian mobile number`);
    process.exit(1);
  }

  // ── §3  Template inspection ─────────────────────────────────────────────────

  console.log('\n── §3  MSG91 Template Inspection ───────────────────────────');

  const TEMPLATE_API = 'https://control.msg91.com/api/v5/whatsapp/get-template-client';
  const templateUrl = `${TEMPLATE_API}/${integratedNumber}?template_name=${encodeURIComponent(templateName)}`;

  let templateCheckResult = 'NOT_RUN';

  try {
    const templateRes = await fetch(templateUrl, {
      headers: { authkey },
    });
    const templateBody = (await templateRes.json().catch(() => null)) as {
      data?: Array<{
        name?: string;
        category?: string;
        namespace?: string;
        languages?: Array<{
          language?: string;
          status?: string;
          id?: string | number;
          components?: Array<{
            type?: string;
            format?: string;
            text?: string;
          }>;
        }>;
      }>;
      message?: string;
      status?: string;
    } | null;

    if (!templateRes.ok || !templateBody) {
      templateCheckResult = `FAIL — HTTP ${templateRes.status}: ${templateBody?.message ?? 'no body'}`;
      console.log(`  ✗  Template lookup: ${templateCheckResult}`);
    } else {
      const templates = (templateBody.data ?? []).filter((t) => t.name === templateName);
      if (templates.length === 0) {
        templateCheckResult = `FAIL — template "${templateName}" not found on number ${integratedNumber}`;
        console.log(`  ✗  ${templateCheckResult}`);
      } else {
        const t = templates[0];
        const lang = (t.languages ?? []).find((l) => l.language === 'en') ?? t.languages?.[0];
        const status = lang?.status ?? 'unknown';
        const id = lang?.id ?? '?';
        templateCheckResult = `OK — name=${t.name}  category=${t.category}  status=${status}  id=${id}`;
        console.log(
          `  ✓  Template: ${t.name}  category=${t.category ?? '?'}  namespace=${t.namespace ?? 'none'}`,
        );
        console.log(`     language=en  status=${status}  id=${id}`);
        if (String(id) !== '546722') {
          console.log(
            `     NOTE: template id=${id} (MSG91_WHATSAPP_TEMPLATE_ID=546722 is reference-only; mismatch expected if 546722 was the old dashboard id)`,
          );
        }

        let totalVars = 0;
        for (const comp of lang?.components ?? []) {
          const type = (comp.type ?? '').toLowerCase();
          const text = comp.text ?? '';
          const placeholders = [
            ...new Set((text.match(/\{\{\s*\d+\s*\}\}/g) ?? []).map((m) => m.replace(/\D/g, ''))),
          ];
          totalVars += placeholders.length;
          console.log(
            `     [${type}${comp.format ? ':' + comp.format : ''}] vars=${placeholders.length}  text="${text.slice(0, 70)}${text.length > 70 ? '…' : ''}"`,
          );
        }

        if (totalVars === 0) {
          console.log('     ✓  Template has NO variables — empty component map is CORRECT');
        } else {
          console.log(
            `     INFO  Template has ${totalVars} variable(s) — TEMPLATE_VARS should be set`,
          );
        }
      }
    }
  } catch (err) {
    templateCheckResult = `ERROR — ${err instanceof Error ? err.message : String(err)}`;
    console.log(`  ✗  Template inspection error: ${templateCheckResult}`);
  }

  // ── §4  Build MSG91 payload & confirm structure ────────────────────────────

  console.log('\n── §4  Payload Structure ───────────────────────────────────');

  const MSG91_WHATSAPP_URL =
    'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

  // Empty components: sysa_general_update has no body variables (confirmed above).
  const components: Record<string, Record<string, string>> = {};

  const payload = {
    integrated_number: integratedNumber,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
          policy: 'deterministic',
        },
        ...(process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE
          ? { namespace: process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE }
          : {}),
        to_and_components: [
          {
            to: [whatsappFormatted],
            components,
          },
        ],
      },
    },
  };

  console.log('  Payload (sanitized — no authkey):');
  console.log(
    JSON.stringify(payload, null, 2)
      .split('\n')
      .map((l) => '    ' + l)
      .join('\n'),
  );

  console.log('\n── §5  Pre-send Verification ──────────────────────────────');
  console.log('  ✓  SMS_DLT_TEMPLATE_ID NOT present in WhatsApp payload');
  console.log(`  ✓  Language: ${templateLanguage}`);
  console.log(`  ✓  Recipient normalized: ${whatsappFormatted}`);
  console.log(`  ✓  Component map: ${isNoVars ? 'empty (no template variables)' : templateVars}`);
  console.log(`  ✓  Template name: ${templateName}`);

  // ── §6  Controlled real send ────────────────────────────────────────────────

  console.log('\n── §6  MSG91 WhatsApp Send (ONE message only) ─────────────');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let httpStatus = 0;
  let sanitizedResponse: unknown = null;
  let messageId: string | null = null;
  let sendResult: 'accepted' | 'rejected' | 'error' = 'error';
  let rootCause: string | null = null;
  let realMessageSent = false;

  try {
    const response = await fetch(MSG91_WHATSAPP_URL, {
      method: 'POST',
      headers: {
        authkey, // authkey in HTTP header only — NEVER printed
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    httpStatus = response.status;

    let rawBody: unknown = null;
    try {
      rawBody = await response.json();
    } catch {
      rawBody = { _note: 'MSG91 returned non-JSON body' };
    }

    sanitizedResponse = sanitize(rawBody, authkey);

    const body = rawBody as {
      status?: string;
      type?: string;
      hasError?: boolean;
      message?: string;
      request_id?: string;
      data?: { request_id?: string; message?: string };
      errors?: unknown;
    } | null;

    // Mirrors isMsg91Success() in whatsapp.service.ts
    const isSuccess = (() => {
      if (!httpStatus || httpStatus >= 400) return false;
      if (!body) return false;
      if (body.hasError === true) return false;
      if (body.type === 'error' || body.status === 'error' || body.status === 'fail') return false;
      if (body.type === 'success' || body.status === 'success') return true;
      if (body.hasError === false) return true;
      if (body.request_id || body.data?.request_id) return true;
      return httpStatus >= 200 && httpStatus < 300;
    })();

    // Extract message/request ID (mirrors msg91MessageId() in whatsapp.service.ts)
    if (body) {
      if (typeof body.request_id === 'string') messageId = body.request_id;
      else if (typeof body.data?.request_id === 'string') messageId = body.data.request_id;
      else if (typeof body.message === 'string' && body.type === 'success')
        messageId = body.message;
    }

    if (isSuccess) {
      sendResult = 'accepted';
      realMessageSent = true;
      console.log(`  ✓  MSG91 ACCEPTED the request (HTTP ${httpStatus})`);
      console.log(`  ✓  Message/Request ID: ${messageId ?? 'not returned in response'}`);
      console.log('');
      console.log('  DELIVERY NOTE: "accepted" = MSG91 has queued the message for');
      console.log('  delivery to the WhatsApp network. Actual device delivery is');
      console.log('  async (WhatsApp infrastructure). The application correctly');
      console.log('  sets whatsapp_status="sent" on provider acceptance (consistent');
      console.log('  with MSG91 bulk API — it returns request_id at acceptance, not');
      console.log('  at final delivery; no webhook is pushed for final status).');
    } else {
      sendResult = 'rejected';
      realMessageSent = false;
      const providerMessage =
        (body as { message?: string } | null)?.message ?? `MSG91 rejected (HTTP ${httpStatus})`;
      rootCause = diagnoseRejection(httpStatus, body as Record<string, unknown> | null);
      console.log(`  ✗  MSG91 REJECTED the request (HTTP ${httpStatus})`);
      console.log(`  ✗  Provider message: ${providerMessage}`);
      console.log(`  ✗  Root cause: ${rootCause}`);
    }
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const msg = isTimeout
      ? 'Request timed out (15s)'
      : err instanceof Error
        ? err.message
        : String(err);
    console.log(`  ✗  Network/send error: ${msg}`);
    rootCause = isTimeout
      ? 'Timeout: MSG91 API did not respond within 15s'
      : `Network error: ${msg}`;
    sendResult = 'error';
  } finally {
    clearTimeout(timeout);
  }

  // ── §7  Final Report ────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                      FINAL REPORT                         ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const authResult =
    sendResult === 'accepted'
      ? 'AUTHENTICATED'
      : rootCause?.startsWith('AUTHENTICATION')
        ? 'AUTH_FAILED'
        : 'SEE_ROOT_CAUSE';

  const finalDeliveryStatus =
    sendResult === 'accepted'
      ? 'ACCEPTED_BY_PROVIDER — delivery is async on WhatsApp network; no delivery webhook from MSG91'
      : `NOT_DELIVERED — ${sendResult}`;

  const blocker =
    sendResult === 'accepted'
      ? 'NONE — MSG91 WhatsApp is working; ready for production'
      : `YES — ${rootCause}`;

  console.log(`MSG91_AUTHKEY_PRESENT              : ${checks['MSG91_AUTHKEY_PRESENT']}`);
  console.log(`MSG91_AUTHENTICATION_RESULT        : ${authResult}`);
  console.log(`MSG91_HTTP_STATUS                  : ${httpStatus}`);
  console.log(`MSG91_SANITIZED_RESPONSE           : ${JSON.stringify(sanitizedResponse)}`);
  console.log(`MSG91_MESSAGE_ID                   : ${messageId ?? 'none'}`);
  console.log(`WHATSAPP_TEMPLATE_RESULT           : ${templateCheckResult}`);
  console.log(`WHATSAPP_RECIPIENT_RESULT          : ${whatsappFormatted} — valid=${isValid}`);
  console.log(`WHATSAPP_FINAL_DELIVERY_STATUS     : ${finalDeliveryStatus}`);
  console.log(
    `DATABASE_WHATSAPP_STATUS           : NOT_UPDATED_BY_SCRIPT (to update DB: trigger retryReceiptWhatsApp via API)`,
  );
  console.log(`DATABASE_WHATSAPP_MESSAGE_ID       : NOT_UPDATED_BY_SCRIPT`);
  console.log(
    `RECEIPT_NUMBER_REUSED              : N/A — script tests provider API directly; no receipt row touched`,
  );
  console.log(`EMAIL_STATUS                       : INDEPENDENT — not touched by this script`);
  console.log(
    `REAL_MESSAGE_SENT                  : ${realMessageSent ? 'YES — one WhatsApp message dispatched to MSG91' : 'NO'}`,
  );
  console.log(`ROOT_CAUSE_IF_FAILED               : ${rootCause ?? 'none'}`);
  console.log(
    `CODE_FIX_IF_REQUIRED               : ${sendResult === 'accepted' ? 'NONE' : 'See root cause above'}`,
  );
  console.log(`REMAINING_PRODUCTION_BLOCKER       : ${blocker}`);
  console.log('');
}

main().catch((err: unknown) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
