/**
 * Controlled MSG91 WhatsApp receipt test — the operator's tool for proving the
 * real `sysa_donation_receipt` send works, one message, to a number they own.
 *
 *   npx tsx scripts/msg91-whatsapp-receipt-test.ts            # plan only: checks + payload, sends NOTHING
 *   npx tsx scripts/msg91-whatsapp-receipt-test.ts --send     # sends exactly ONE message
 *
 * Requires TEST_RECIPIENT_PHONE (never the business sender number).
 *
 * It sends through the API's own `sendWhatsAppReceipt`, so every production
 * safeguard applies unchanged: the marketing template (`sysa_general_update`)
 * is refused for receipts, the template id and Meta approval must be
 * configured, the recipient is validated, the payload is the API's exact
 * payload, and permanent/transient provider errors are classified the same
 * way. (An earlier version of this script hard-coded `sysa_general_update`
 * with no variables — the source of the 2026-10-12 "Failed By Meta" entry.)
 *
 * MSG91 *accepting* a request is not delivery: Meta can still decline it
 * afterwards ("Failed By Meta" in MSG91 → WhatsApp → Logs, which shows the
 * Meta error code). This script therefore never reports delivery or
 * production readiness. Config comes from api/.env + api/.env.local via
 * src/config/env.ts; the AuthKey is never printed.
 */
import path from 'node:path';

import { env } from '@config/env';
import {
  RECEIPT_TEMPLATE_NAME,
  buildMsg91WhatsAppPayload,
  sendWhatsAppReceipt,
  type WhatsAppReceiptInput,
} from '@integrations/whatsapp/whatsapp.service';
import { maskPhone } from '@utils/pii-mask';
import { redactSecrets } from '@utils/redact-secrets';

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

export interface ResolveRecipientInput {
  TEST_RECIPIENT_PHONE?: string;
  MSG91_WHATSAPP_NUMBER?: string;
  MSG91_WHATSAPP_INTEGRATED_NUMBER?: string;
}

export function resolveTestRecipient(
  envVars: ResolveRecipientInput,
): { ok: true; recipient: string; formatted: string } | { ok: false; error: string } {
  const explicit = envVars.TEST_RECIPIENT_PHONE?.trim();
  if (!explicit) {
    return {
      ok: false,
      error:
        'TEST_RECIPIENT_PHONE environment variable is required. Never falling back to integrated sender number.',
    };
  }

  const senderNumber = (
    envVars.MSG91_WHATSAPP_INTEGRATED_NUMBER ||
    envVars.MSG91_WHATSAPP_NUMBER ||
    ''
  ).replace(/\D/g, '');

  const normalized = normalizeIndianMobile(explicit);
  if (senderNumber && normalizeIndianMobile(senderNumber) === normalized) {
    return {
      ok: false,
      error:
        'TEST_RECIPIENT_PHONE cannot be the integrated sender number. Specify an explicit distinct test recipient.',
    };
  }

  if (!isValidIndianMobile(explicit)) {
    return {
      ok: false,
      error: `"${explicit}" is not a valid 10-digit Indian mobile number.`,
    };
  }

  return {
    ok: true,
    recipient: normalized,
    formatted: toWhatsAppMobile(explicit),
  };
}

export interface ControlledSendConfig {
  MSG91_WHATSAPP_TEMPLATE_NAME?: string;
  MSG91_WHATSAPP_TEMPLATE_ID?: string;
  MSG91_WHATSAPP_TEMPLATE_APPROVED?: string;
  MSG91_WHATSAPP_AUTHKEY?: string;
  MSG91_WHATSAPP_INTEGRATED_NUMBER?: string;
}

/** Everything that must hold before a real receipt-template send. Problems
 * name settings only — never values that could be secret. */
export function checkControlledSendConfig(config: ControlledSendConfig): string[] {
  const problems: string[] = [];
  if (config.MSG91_WHATSAPP_TEMPLATE_NAME !== RECEIPT_TEMPLATE_NAME) {
    problems.push(
      `MSG91_WHATSAPP_TEMPLATE_NAME must be ${RECEIPT_TEMPLATE_NAME} (got "${config.MSG91_WHATSAPP_TEMPLATE_NAME ?? ''}") — never the marketing template sysa_general_update`,
    );
  }
  if (!config.MSG91_WHATSAPP_TEMPLATE_ID) problems.push('MSG91_WHATSAPP_TEMPLATE_ID is not set');
  if (config.MSG91_WHATSAPP_TEMPLATE_APPROVED !== 'true') {
    problems.push(
      'MSG91_WHATSAPP_TEMPLATE_APPROVED is not true (confirm APPROVED with the inspect script first)',
    );
  }
  if (!config.MSG91_WHATSAPP_AUTHKEY) problems.push('MSG91_AUTHKEY is not set');
  if (!config.MSG91_WHATSAPP_INTEGRATED_NUMBER) problems.push('MSG91_WHATSAPP_NUMBER is not set');
  return problems;
}

async function main(): Promise<void> {
  const send = process.argv.includes('--send');
  console.log(
    `\nMSG91 WhatsApp receipt test — ${send ? 'SEND ONE MESSAGE' : 'PLAN ONLY (no message is sent; add --send)'}\n`,
  );

  const problems = checkControlledSendConfig(env);
  const recipient = resolveTestRecipient({
    TEST_RECIPIENT_PHONE: process.env.TEST_RECIPIENT_PHONE,
    MSG91_WHATSAPP_NUMBER: env.MSG91_WHATSAPP_NUMBER,
    MSG91_WHATSAPP_INTEGRATED_NUMBER: env.MSG91_WHATSAPP_INTEGRATED_NUMBER,
  });
  if (!recipient.ok) problems.push(recipient.error);

  console.log(
    `  template      : ${env.MSG91_WHATSAPP_TEMPLATE_NAME ?? '(unset)'}  id=${env.MSG91_WHATSAPP_TEMPLATE_ID ?? '(unset)'}  language=${env.MSG91_WHATSAPP_TEMPLATE_LANGUAGE}`,
  );
  console.log(`  approved flag : ${env.MSG91_WHATSAPP_TEMPLATE_APPROVED ?? '(unset)'}`);
  console.log(
    `  sender        : ${env.MSG91_WHATSAPP_INTEGRATED_NUMBER?.replace(/\D/g, '') ?? '(unset)'}`,
  );
  console.log(`  recipient     : ${recipient.ok ? maskPhone(recipient.formatted) : '(invalid)'}`);
  console.log(`  authkey       : ${env.MSG91_WHATSAPP_AUTHKEY ? 'present' : 'MISSING'}`);

  if (problems.length > 0) {
    console.error('\n✗ Not ready — nothing sent:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  if (!recipient.ok) return; // unreachable; narrows the type

  const input: WhatsAppReceiptInput = {
    to: recipient.recipient,
    customerName: 'SYSA Test Donor',
    amountFormatted: '1',
    receiptNumber: `TEST-${new Date().toISOString().slice(0, 10)}`,
    donationDate: new Date().toLocaleDateString('en-IN'),
    paymentId: null,
    documentUrl: null,
    filename: 'Payment-Receipt-TEST.pdf',
  };

  const built = buildMsg91WhatsAppPayload(input);
  if (!built.ok) {
    console.error(`\n✗ Payload could not be built — nothing sent: ${built.error}`);
    process.exit(1);
  }
  const [target] = built.payload.payload.template.to_and_components;
  console.log('\n  payload components (exact API payload):');
  console.log(`  ${JSON.stringify(target.components)}`);

  if (!send) {
    console.log('\n✓ Plan only — no request was made. Re-run with --send to send ONE message.');
    return;
  }

  const result = await sendWhatsAppReceipt(input);
  console.log('\n  provider result:');
  console.log(`    status       : ${result.status}`);
  console.log(`    request id   : ${result.messageId ?? 'none'}`);
  console.log(`    permanent    : ${result.permanent ? 'yes (not retried automatically)' : 'no'}`);
  console.log(`    reason       : ${redactSecrets(result.failureReason ?? 'none')}`);
  if (result.status === 'sent') {
    console.log(
      '\n  ACCEPTED by MSG91 — this is NOT delivery. Confirm on the recipient phone, and in',
    );
    console.log(
      '  MSG91 → WhatsApp → Logs (search the request id): "Failed By Meta" there shows the',
    );
    console.log('  Meta error code. Do not treat acceptance as production readiness.');
  }
}

// Run directly when executed as a CLI script (not when imported by tests).
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err: unknown) => {
    console.error('Fatal:', redactSecrets(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
}
