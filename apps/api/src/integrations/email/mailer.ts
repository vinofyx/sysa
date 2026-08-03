import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '@config/env';
import { logger } from '@lib/logger';

/**
 * Transactional email transporter. Auth emails (verification, password reset,
 * security notices — see ./templates/auth.templates.ts) are wired up in Phase 4;
 * donation receipts and other business-domain emails (FR-NOTIF-01) follow in the
 * feature-development phase.
 */
let transporter: Transporter | null = null;

export function getMailer(): Transporter {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    logger.warn(
      'SMTP credentials not configured — email notifications will be unavailable until SMTP_* env vars are set.',
    );
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        }
      : undefined,
  });

  return transporter;
}

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email if SMTP is configured; otherwise logs the attempt and no-ops.
 * This keeps local/dev environments (no SMTP credentials) fully functional for
 * every OTHER auth flow — the caller still records the intended action (e.g. a
 * password-reset token is still created) even if delivery is unavailable.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  if (!env.SMTP_HOST) {
    logger.warn(`Email not sent (SMTP not configured): "${input.subject}" to ${input.to}`);
    return;
  }

  try {
    await getMailer().sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (error) {
    logger.error('Failed to send email', {
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : error,
    });
  }
}
