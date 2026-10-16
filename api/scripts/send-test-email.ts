/**
 * Controlled real SMTP receipt delivery test script for SYSA.
 *
 * Usage:
 *   Handshake / configuration check only (sends NO email):
 *     npx tsx scripts/send-test-email.ts
 *
 *   Controlled single-email test (requires explicit owner recipient & confirmation):
 *     $env:TEST_RECIPIENT_EMAIL="dharanilekkala343@gmail.com"
 *     $env:CONFIRM_SEND="true"
 *     npx tsx scripts/send-test-email.ts
 *
 * Rules:
 *  - Loads api/.env followed by api/.env.local (with override enabled).
 *  - Never prints passwords or full auth credentials.
 *  - Fails closed if TEST_RECIPIENT_EMAIL is missing or points to example.com.
 *  - Distinguishes SMTP acceptance from end-to-end inbox delivery.
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';

// Load .env then .env.local (same order and precedence as env.ts).
const apiRoot = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(apiRoot, '.env') });
loadDotenv({ path: path.join(apiRoot, '.env.local'), override: true });

export function maskEmail(email: string | undefined): string {
  if (!email || !email.includes('@')) return '[NOT CONFIGURED]';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export interface ResolveEmailRecipientInput {
  TEST_RECIPIENT_EMAIL?: string;
  EMAIL_FROM?: string;
  SMTP_FROM?: string;
  SMTP_USER?: string;
}

export function resolveTestEmailRecipient(
  envVars: ResolveEmailRecipientInput,
): { ok: true; recipient: string; masked: string } | { ok: false; error: string } {
  const raw = envVars.TEST_RECIPIENT_EMAIL?.trim();
  if (!raw) {
    return {
      ok: false,
      error:
        'TEST_RECIPIENT_EMAIL environment variable is required. Never falling back to default or sender address.',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(raw)) {
    return {
      ok: false,
      error: `"${raw}" is not a valid email address format.`,
    };
  }

  const lower = raw.toLowerCase();
  const domain = lower.split('@')[1];
  const reservedDomains = [
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'invalid',
    'localhost',
  ];
  if (
    reservedDomains.includes(domain) ||
    domain.endsWith('.example') ||
    domain.endsWith('.invalid')
  ) {
    return {
      ok: false,
      error: `"${domain}" is a reserved or non-routable test domain. Outbound relays (MailChannels/Hostinger) block example.com addresses with 550 5.7.1 [RB]. Use an operator-controlled email address.`,
    };
  }

  const sender = (envVars.EMAIL_FROM || envVars.SMTP_FROM || envVars.SMTP_USER || '')
    .trim()
    .toLowerCase();

  if (sender && sender === lower) {
    return {
      ok: false,
      error:
        'TEST_RECIPIENT_EMAIL cannot be the sender email address. Specify an explicit distinct test recipient.',
    };
  }

  return {
    ok: true,
    recipient: lower,
    masked: maskEmail(lower),
  };
}

export interface ResolvedSmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

export function resolveSmtpSettings(
  source: NodeJS.ProcessEnv = process.env,
): ResolvedSmtpSettings | null {
  const host = source.SMTP_HOST?.trim() || '';
  const port = source.SMTP_PORT ? Number(source.SMTP_PORT) : 587;
  const user = (source.SMTP_USER || source.SMTP_USERNAME)?.trim() || '';
  const pass = (source.SMTP_PASSWORD || source.SMTP_PASS)?.trim() || '';
  const from = (source.EMAIL_FROM || source.SMTP_FROM || user)?.trim() || '';

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
}

async function main(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('       SYSA Controlled SMTP Receipt Delivery Test          ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Timestamp: ${timestamp}\n`);

  const settings = resolveSmtpSettings();
  if (!settings) {
    console.error('✗ ABORT — SMTP configuration is incomplete in api/.env / api/.env.local.');
    console.error('  Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM');
    process.exit(1);
  }

  console.log('── Configuration (Sanitized) ──────────────────────────────');
  console.log(`  Host:               ${settings.host}`);
  console.log(`  Port:               ${settings.port}`);
  console.log(
    `  Mode:               ${settings.secure ? 'Implicit TLS (Port 465)' : 'STARTTLS (Port 587)'}`,
  );
  console.log(`  Sender From:        ${maskEmail(settings.from)}`);
  console.log(`  Auth User:          ${maskEmail(settings.user)}`);
  console.log(`  Extra CA Certs:     ${process.env.NODE_EXTRA_CA_CERTS || '[None]'}`);

  const recipientResult = resolveTestEmailRecipient({
    TEST_RECIPIENT_EMAIL: process.env.TEST_RECIPIENT_EMAIL,
    EMAIL_FROM: settings.from,
    SMTP_USER: settings.user,
  });

  const shouldSend =
    process.env.CONFIRM_SEND === 'true' ||
    process.argv.includes('--send') ||
    process.argv.includes('-s');

  const transporter: Transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.user, pass: settings.pass },
  });

  if (!recipientResult.ok || !shouldSend) {
    console.log('\n── Safety Gate: Handshake Only (No Message Sent) ──────────');
    if (!recipientResult.ok) {
      console.log(`  Recipient status:   ${recipientResult.error}`);
    } else {
      console.log(`  Recipient target:   ${recipientResult.masked}`);
      console.log(`  Confirmation:       CONFIRM_SEND is not set to "true"`);
    }

    console.log('\n── Executing transporter.verify() handshake ───────────────');
    try {
      await transporter.verify();
      console.log('  ✓ SMTP handshake succeeded! Transporter credentials and TLS are valid.');
    } catch (err) {
      console.error('  ✗ SMTP handshake failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    } finally {
      transporter.close();
    }

    console.log('\n── Next Steps for Operator: Controlled Single-Email Test ──');
    console.log('  To execute a real one-time delivery test to an owner-controlled recipient:');
    console.log('    $env:TEST_RECIPIENT_EMAIL="dharanilekkala343@gmail.com"');
    console.log('    $env:CONFIRM_SEND="true"');
    console.log('    npx tsx scripts/send-test-email.ts');
    console.log('═══════════════════════════════════════════════════════════\n');
    return;
  }

  // Confirmed real test execution
  const targetRecipient = recipientResult.recipient;
  console.log('\n── Executing Controlled Email Dispatch ────────────────────');
  console.log(`  Recipient:          ${recipientResult.masked}`);
  console.log(`  Subject:            SYSA — Controlled SMTP Delivery Test`);

  try {
    const info = await transporter.sendMail({
      from: settings.from,
      to: targetRecipient,
      subject: 'SYSA — Controlled SMTP Delivery Test',
      text: [
        'This is a controlled diagnostic test email from the SYSA platform.',
        'Purpose: Validate end-to-end receipt delivery from Hostinger SMTP to Gmail.',
        `Timestamp: ${timestamp}`,
        'No donation was processed or affected.',
      ].join('\n\n'),
      html: [
        '<div style="font-family: Arial, sans-serif; padding: 20px;">',
        '<h2>SYSA — Controlled SMTP Delivery Test</h2>',
        '<p>This is a controlled diagnostic test email from the SYSA platform.</p>',
        '<p><strong>Purpose:</strong> Validate end-to-end receipt delivery from Hostinger SMTP to Gmail.</p>',
        `<p><strong>Timestamp:</strong> ${timestamp}</p>`,
        '<p style="color: #666; font-size: 12px;">No donation was processed or affected.</p>',
        '</div>',
      ].join(''),
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];

    console.log('\n── Delivery Result ────────────────────────────────────────');
    console.log(
      `  SMTP Status:        ${accepted.length > 0 ? 'ACCEPTED by SMTP relay' : 'REJECTED'}`,
    );
    console.log(`  Message ID:         ${info.messageId || '[None]'}`);
    console.log(`  SMTP Response:      ${info.response || '[None]'}`);
    console.log(
      `  Accepted Count:     ${accepted.length} (${accepted.map((a: unknown) => maskEmail(String(a))).join(', ')})`,
    );
    console.log(
      `  Rejected Count:     ${rejected.length}${rejected.length > 0 ? ` (${rejected.map((r: unknown) => maskEmail(String(r))).join(', ')})` : ''}`,
    );

    if (rejected.length > 0) {
      console.warn('\n  ⚠ Warning: SMTP server explicitly rejected the recipient.');
    } else {
      console.log('\n  ✓ SMTP server accepted the message for delivery.');
      console.log('  NOTE: SMTP acceptance confirms handoff to Hostinger (smtp.hostinger.com).');
      console.log(
        '  Recipient MUST now check Gmail Inbox (and Spam/Junk folder) to confirm delivery.',
      );
    }
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (err: unknown) {
    const errObj = err as {
      code?: string;
      command?: string;
      response?: string;
      responseCode?: number;
      message?: string;
    };
    console.error('\n── SMTP Delivery Error ────────────────────────────────────');
    console.error(`  Error:              ${errObj?.message || String(err)}`);
    if (errObj?.code) console.error(`  Error Code:         ${errObj.code}`);
    if (errObj?.command) console.error(`  SMTP Command:       ${errObj.command}`);
    if (errObj?.response) console.error(`  Server Response:    ${errObj.response}`);
    if (errObj?.responseCode) console.error(`  Response Code:      ${errObj.responseCode}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  } finally {
    transporter.close();
  }
}

// Run directly when executed as a CLI script
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error('Fatal execution error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
