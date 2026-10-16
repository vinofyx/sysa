/**
 * Safe SMTP Connection Verification Utility
 *
 * Checks SMTP connection and handshake with the configured mail server
 * using transporter.verify() only.
 *
 * Rules:
 * - NEVER sends an email.
 * - NEVER prints or logs passwords, API keys, or raw secrets.
 * - Strictly validates TLS by default.
 * - Diagnoses certificate chain issues (such as local antivirus interception).
 *
 * Usage:
 *   npx tsx scripts/verify-smtp-connection.ts
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';

// Load .env then .env.local (same order and precedence as env.ts).
const apiRoot = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(apiRoot, '.env') });
loadDotenv({ path: path.join(apiRoot, '.env.local'), override: true });

export interface SmtpVerifyConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  secure?: boolean;
  rejectUnauthorized?: boolean;
}

export interface SmtpVerifyResult {
  ok: boolean;
  host: string;
  port: number;
  secure: boolean;
  userConfigured: boolean;
  fromConfigured: boolean;
  error?: string;
  diagnosis?: string;
}

export function maskEmail(email: string | undefined): string {
  if (!email || !email.includes('@')) return '[NOT CONFIGURED]';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function resolveSmtpConfig(source: NodeJS.ProcessEnv = process.env): SmtpVerifyConfig {
  const host = source.SMTP_HOST?.trim();
  const port = source.SMTP_PORT ? Number(source.SMTP_PORT) : 587;
  const user = (source.SMTP_USER || source.SMTP_USERNAME)?.trim();
  const pass = source.SMTP_PASSWORD?.trim();
  const from = (source.SMTP_FROM || source.EMAIL_FROM)?.trim();
  const secure = port === 465;

  return {
    host,
    port,
    user,
    pass,
    from,
    secure,
    rejectUnauthorized: source.NODE_ENV === 'production' || source.SMTP_STRICT_TLS === 'true',
  };
}

export async function verifySmtpConnection(
  overrides: Partial<SmtpVerifyConfig> = {},
): Promise<SmtpVerifyResult> {
  const config = { ...resolveSmtpConfig(), ...overrides };

  if (!config.host) {
    return {
      ok: false,
      host: '',
      port: config.port ?? 587,
      secure: Boolean(config.secure),
      userConfigured: Boolean(config.user),
      fromConfigured: Boolean(config.from),
      error: 'SMTP_HOST is not configured in environment',
      diagnosis: 'Add SMTP_HOST to api/.env or api/.env.local',
    };
  }

  // Never allow rejectUnauthorized=false in production
  const isProduction = process.env.NODE_ENV === 'production';
  const rejectUnauthorized = isProduction ? true : (config.rejectUnauthorized ?? true);

  const transporter: Transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user
      ? {
          user: config.user,
          pass: config.pass,
        }
      : undefined,
    tls: {
      rejectUnauthorized,
    },
  });

  try {
    await transporter.verify();
    return {
      ok: true,
      host: config.host,
      port: config.port ?? 587,
      secure: Boolean(config.secure),
      userConfigured: Boolean(config.user),
      fromConfigured: Boolean(config.from),
    };
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    let diagnosis: string | undefined;

    if (rawMessage.includes('self-signed certificate in certificate chain')) {
      diagnosis =
        'Local antivirus or proxy TLS inspection detected (e.g. Avast/AVG Web/Mail Shield). ' +
        'In production on Linux, standard CAs are trusted by default. ' +
        'For strict local verification on Windows without disabling TLS, export the local CA and run with NODE_EXTRA_CA_CERTS.';
    } else if (rawMessage.includes('ECONNREFUSED')) {
      diagnosis = `Connection refused on ${config.host}:${config.port}. Check host address and firewall rules.`;
    } else if (rawMessage.includes('ECONNRESET')) {
      diagnosis =
        `Connection reset on ${config.host}:${config.port}. ` +
        (config.port === 587
          ? 'Port 587 requires STARTTLS; ensure client does not attempt direct SSL handshake.'
          : 'Check network connectivity.');
    } else if (
      rawMessage.includes('Invalid login') ||
      rawMessage.includes('Authentication failed')
    ) {
      diagnosis =
        'SMTP authentication failed. Verify SMTP username and password in host mail manager.';
    }

    return {
      ok: false,
      host: config.host,
      port: config.port ?? 587,
      secure: Boolean(config.secure),
      userConfigured: Boolean(config.user),
      fromConfigured: Boolean(config.from),
      error: rawMessage,
      diagnosis,
    };
  }
}

async function main(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('       SYSA Safe SMTP Connection Verification Utility       ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   (Verifies transporter handshake only; sends NO mail)    \n');

  const config = resolveSmtpConfig();
  console.log('── Configuration (Sanitized) ──────────────────────────────');
  console.log(`  Host:               ${config.host || '[NOT SET]'}`);
  console.log(`  Port:               ${config.port}`);
  console.log(
    `  Mode:               ${config.secure ? 'Implicit TLS (Port 465)' : 'STARTTLS (Port 587)'}`,
  );
  console.log(`  Auth User:          ${maskEmail(config.user)}`);
  console.log(`  From Address:       ${maskEmail(config.from)}`);
  console.log(
    `  TLS Verification:   Strict (rejectUnauthorized: ${config.rejectUnauthorized ? 'true' : 'default'})`,
  );
  console.log(`  Extra CA Certs:     ${process.env.NODE_EXTRA_CA_CERTS || '[None]'}`);

  console.log('\n── Executing transporter.verify() ─────────────────────────');
  const result = await verifySmtpConnection();

  if (result.ok) {
    console.log('  ✓ SMTP Handshake Succeeded! Transporter is ready.');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log(`  ✗ SMTP Handshake Failed: ${result.error}`);
    if (result.diagnosis) {
      console.log(`\n  Diagnostic Insight:\n    ${result.diagnosis}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run directly when executed as a CLI script
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error('Fatal execution error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
