/**
 * Prints the approved MSG91 WhatsApp template's structure so
 * MSG91_WHATSAPP_TEMPLATE_VARS can be set from the real definition instead of
 * guessing variable positions.
 *
 *   npx tsx scripts/msg91-inspect-whatsapp-template.ts
 *
 *   npx tsx scripts/msg91-inspect-whatsapp-template.ts sysa_donation_receipt
 *
 * Reads MSG91_AUTHKEY (only — never a legacy key name), MSG91_WHATSAPP_NUMBER
 * (or MSG91_WHATSAPP_INTEGRATED_NUMBER), MSG91_WHATSAPP_TEMPLATE_NAME and
 * MSG91_WHATSAPP_TEMPLATE_ID the same way the API does: api/.env, then
 * api/.env.local on top. A template name argument overrides the env one.
 * Read-only: a single GET that lists templates; it sends no message. The
 * authkey is only ever placed in the request header — never printed (any
 * echo of it in provider output is redacted) or written anywhere.
 */
import { config as loadDotenv } from 'dotenv';

// Same precedence as src/config/env.ts (.env, then .env.local on top), with
// override so a stale key exported in the shell is never used instead.
loadDotenv({ path: '.env', override: true });
loadDotenv({ path: '.env.local', override: true });

const FIELD_CHOICES =
  '<customerName|amountFormatted|receiptNumber|donationDate|paymentId|receiptUrl>';

const TEMPLATE_API = 'https://control.msg91.com/api/v5/whatsapp/get-template-client';

interface TemplateComponent {
  type?: string;
  format?: string;
  text?: string;
  buttons?: Array<{ type?: string; text?: string; url?: string }>;
}

interface TemplateLanguage {
  /** MSG91 returns components as `code` (older docs call it `components`). */
  code?: TemplateComponent[];
  msg91_template_id?: number | string;
  variables?: string[];
  rejection_reason?: string;
  language?: string;
  status?: string;
  id?: string | number;
  components?: TemplateComponent[];
}

interface TemplateEntry {
  name?: string;
  category?: string;
  namespace?: string;
  languages?: TemplateLanguage[];
}

function placeholderCount(text: string | undefined): number {
  const matches = text?.match(/\{\{\s*\d+\s*\}\}/g) ?? [];
  return new Set(matches.map((m) => m.replace(/\D/g, ''))).size;
}

async function main(): Promise<void> {
  const authkey = process.env.MSG91_AUTHKEY?.trim();
  const number = (
    process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER ||
    process.env.MSG91_WHATSAPP_NUMBER ||
    ''
  ).replace(/\D/g, '');
  const templateName = process.argv[2] || process.env.MSG91_WHATSAPP_TEMPLATE_NAME;
  const expectedId = process.env.MSG91_WHATSAPP_TEMPLATE_ID;

  const missing = [
    !authkey && 'MSG91_AUTHKEY',
    !number && 'MSG91_WHATSAPP_NUMBER',
    !templateName && 'MSG91_WHATSAPP_TEMPLATE_NAME',
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const url = `${TEMPLATE_API}/${number}?template_name=${encodeURIComponent(templateName as string)}`;
  const response = await fetch(url, { headers: { authkey: authkey as string } });
  const redact = (text: string): string => text.split(authkey as string).join('[REDACTED]');
  const log = console.log;
  console.log = (...args: unknown[]) => log(...args.map((a) => redact(String(a))));
  const logError = console.error;
  console.error = (...args: unknown[]) => logError(...args.map((a) => redact(String(a))));
  const body = (await response.json().catch(() => null)) as {
    data?: TemplateEntry[];
    message?: string;
    status?: string;
  } | null;

  if (!response.ok || !body) {
    console.error(`MSG91 returned HTTP ${response.status}: ${body?.message ?? 'no JSON body'}`);
    process.exit(1);
  }

  const templates = (body.data ?? []).filter((t) => t.name === templateName);
  if (templates.length === 0) {
    console.error(`Template "${templateName}" was not found on integrated number ${number}.`);
    process.exit(1);
  }

  for (const template of templates) {
    console.log(`Template: ${template.name}  category=${template.category ?? '?'}`);
    if (template.namespace) console.log(`  namespace: ${template.namespace}`);
    for (const lang of template.languages ?? []) {
      const idNote =
        expectedId && ![String(lang.id), String(lang.msg91_template_id)].includes(expectedId)
          ? `  (≠ MSG91_WHATSAPP_TEMPLATE_ID ${expectedId})`
          : '';
      console.log(
        `  language=${lang.language}  status=${lang.status}  meta_id=${lang.id ?? '?'}  msg91_template_id=${lang.msg91_template_id ?? '?'}${idNote}`,
      );
      if (lang.rejection_reason && lang.rejection_reason !== 'NONE') {
        console.log(`  rejection_reason=${lang.rejection_reason}`);
      }
      if (lang.variables?.length) console.log(`  variables: ${lang.variables.join(', ')}`);
      if (String(lang.status).toUpperCase() !== 'APPROVED') {
        console.log('  NOT APPROVED — keep MSG91_WHATSAPP_TEMPLATE_APPROVED unset.');
      }

      const suggested: Record<string, string> = {};
      for (const component of lang.code ?? lang.components ?? []) {
        const type = (component.type ?? '').toLowerCase();
        console.log(
          `    [${type}${component.format ? `:${component.format}` : ''}] ${component.text ?? ''}`,
        );
        if (type === 'header' && component.format && component.format !== 'TEXT') {
          suggested.header_1 =
            component.format === 'DOCUMENT' ? 'document' : `<${component.format}>`;
        }
        const count = placeholderCount(component.text);
        for (let i = 1; i <= count; i += 1) {
          suggested[`${type}_${i}`] = FIELD_CHOICES;
        }
        (component.buttons ?? []).forEach((button, index) => {
          console.log(
            `      button ${index + 1} [${button.type ?? '?'}] ${button.text ?? ''} ${button.url ?? ''}`,
          );
          if (placeholderCount(button.url) > 0) suggested[`button_${index + 1}`] = FIELD_CHOICES;
        });
      }
      console.log(`    MSG91_WHATSAPP_TEMPLATE_VARS keys to fill: ${JSON.stringify(suggested)}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
