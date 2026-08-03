import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '@config/env';
import { logger } from '@lib/logger';

/**
 * Transactional email transporter — foundational config only.
 * Actual send workflows (donation receipts, volunteer confirmations, contact
 * acknowledgments — see documentation/03-Functional-Requirements.md FR-NOTIF-01)
 * are implemented in the feature-development phase.
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
