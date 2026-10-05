/**
 * Prints the approved MSG91 WhatsApp template's structure so
 * MSG91_WHATSAPP_TEMPLATE_VARS can be set from the real definition instead of
 * guessing variable positions.
 *
 *   npx tsx scripts/msg91-inspect-whatsapp-template.ts
 *
 * Reads MSG91_AUTHKEY (only — never a legacy key name), MSG91_WHATSAPP_NUMBER
 * (or MSG91_WHATSAPP_INTEGRATED_NUMBER), MSG91_WHATSAPP_TEMPLATE_NAME and
 * MSG91_WHATSAPP_TEMPLATE_ID from api/.env (never .env.local). Read-only: a
 * single GET that lists templates; it sends no message. The authkey is only
 * ever placed in the request header — never printed or written anywhere.
 */
import { config as loadDotenv } from 'dotenv';

// override: api/.env is the only source — a stale key exported in the shell
// must not be used instead.
loadDotenv({ path: '.env', override: true });

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
  const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_NAME;
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
        expectedId && lang.id != null && String(lang.id) !== expectedId
          ? `  (≠ MSG91_WHATSAPP_TEMPLATE_ID ${expectedId})`
          : '';
      console.log(
        `  language=${lang.language}  status=${lang.status}  id=${lang.id ?? '?'}${idNote}`,
      );

      const suggested: Record<string, string> = {};
      for (const component of lang.components ?? []) {
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
