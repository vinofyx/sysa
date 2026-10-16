import nodemailer, { type Transporter } from 'nodemailer';

import { env, emailFromAddress } from '@config/env';
import { logger } from '@lib/logger';
import { maskEmail } from '@utils/pii-mask';
import { redactSecrets } from '@utils/redact-secrets';

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
    // Local Windows dev machines often sit behind antivirus/corporate TLS
    // inspection that swaps in a self-signed cert, which Node's default
    // strict verification correctly rejects ("self-signed certificate in
    // certificate chain") — real SMTP providers' own certs are never
    // self-signed. Relaxed only in development so this never touches the
    // real deployment's (production) certificate verification.
    tls: env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : undefined,
  });

  return transporter;
}

export type MailSendStatus = 'sent' | 'failed' | 'not_configured';

export interface MailDeliveryResult {
  status: MailSendStatus;
  messageId?: string | null;
  failureReason?: string | null;
  /** The server permanently rejected this recipient (5xx) — retrying the
   * same message cannot succeed, so it is never auto-retried. */
  permanent?: boolean;
}

/** SMTP reply code at the start of a server response ("550 5.1.1 …"). */
function smtpReplyCode(response: unknown): number | null {
  const match = typeof response === 'string' ? response.match(/^\s*([2-5]\d\d)\b/) : null;
  return match ? Number(match[1]) : null;
}

/** @deprecated Use MailDeliveryResult.status — kept so existing callers still type-check. */
export type MailSendResult = MailSendStatus;

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
}

/** Persisted as the channel's failure reason — secrets are scrubbed first. */
function truncateReason(rawReason: string, max = 500): string {
  const reason = redactSecrets(rawReason);
  return reason.length <= max ? reason : `${reason.slice(0, max - 1)}…`;
}

export function evaluateSmtpResult(info: {
  accepted?: unknown;
  rejected?: unknown;
  messageId?: unknown;
  response?: unknown;
}): MailDeliveryResult {
  const accepted = Array.isArray(info.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected : [];
  const messageId = typeof info.messageId === 'string' ? info.messageId : null;

  if (rejected.length > 0 || accepted.length === 0) {
    const response = typeof info.response === 'string' ? info.response : 'no server response';
    const failureReason = truncateReason(
      rejected.length > 0
        ? `SMTP rejected the recipient (${response})`
        : `SMTP did not accept the recipient (${response})`,
    );
    // A 4xx (e.g. 450 mailbox busy) is temporary; a 5xx — or an explicit
    // rejection with no parsable code — is a permanent recipient rejection.
    const code = smtpReplyCode(info.response);
    const permanent = code !== null ? code >= 500 : rejected.length > 0;
    return { status: 'failed', messageId, failureReason, permanent };
  }

  return { status: 'sent', messageId };
}

/**
 * Sends an email if SMTP is configured; otherwise logs the attempt and no-ops.
 * This keeps local/dev environments (no SMTP credentials) fully functional for
 * every OTHER auth flow — the caller still records the intended action (e.g. a
 * password-reset token is still created) even if delivery is unavailable.
 *
 * Never throws: a delivery failure is returned as `'failed'` so a successful
 * payment is never rolled back because the inbox was unreachable.
 *
 * `'sent'` is returned only when SMTP accepted the recipient. A throw-free
 * nodemailer call that rejected the address is `'failed'`.
 */
export async function sendMail(input: SendMailInput): Promise<MailDeliveryResult> {
  // Not `timestamp`: that key would overwrite the logger's own timestamp, so
  // an SMTP reply would appear logged at the moment the attempt started.
  const attemptStartedAt = new Date().toISOString();

  if (!env.SMTP_HOST) {
    logger.warn('Email not sent (SMTP not configured)', {
      attemptStartedAt,
      subject: input.subject,
      to: maskEmail(input.to),
    });
    return { status: 'not_configured', failureReason: 'SMTP is not configured' };
  }

  try {
    const info = await getMailer().sendMail({
      from: emailFromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType ?? 'application/pdf',
      })),
    });

    const result = evaluateSmtpResult(info);
    if (result.status !== 'sent') {
      logger.error('SMTP did not accept the email', {
        attemptStartedAt,
        to: maskEmail(input.to),
        subject: input.subject,
        messageId: result.messageId,
        smtpResponse: typeof info.response === 'string' ? info.response : undefined,
        acceptedRecipients: Array.isArray(info.accepted)
          ? info.accepted.map((r: unknown) => maskEmail(String(r)))
          : [],
        rejectedRecipients: Array.isArray(info.rejected)
          ? info.rejected.map((r: unknown) => maskEmail(String(r)))
          : [],
        failureReason: result.failureReason,
      });
      return result;
    }

    logger.info('Email accepted by SMTP', {
      attemptStartedAt,
      to: maskEmail(input.to),
      subject: input.subject,
      attachmentCount: input.attachments?.length ?? 0,
      messageId: result.messageId,
      smtpResponse: typeof info.response === 'string' ? info.response : undefined,
    });
    return result;
  } catch (error) {
    const rawError = error instanceof Error ? error.message : String(error);
    const failureReason = truncateReason(
      error instanceof Error ? error.message : 'SMTP send failed',
    );
    const err = error as {
      code?: string;
      command?: string;
      response?: string;
      responseCode?: number;
    };
    logger.error('Failed to send email', {
      attemptStartedAt,
      to: maskEmail(input.to),
      subject: input.subject,
      errorCode: err?.code,
      smtpCommand: err?.command,
      smtpResponse: err?.response,
      failureReason,
      error: redactSecrets(rawError),
    });
    // Only a 5xx at RCPT TO is about THIS recipient. Account-level 5xx (e.g.
    // 535 auth failure) and network errors stay retryable: fixing the config
    // should let the automatic retry go out.
    const permanent =
      typeof err?.responseCode === 'number' &&
      err.responseCode >= 500 &&
      typeof err.command === 'string' &&
      err.command.toUpperCase().startsWith('RCPT');
    return { status: 'failed', failureReason, permanent };
  }
}
