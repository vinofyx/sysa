import { timingSafeEqual } from 'node:crypto';

import { env } from '@config/env';
import { logger } from '@lib/logger';
import { redactSecrets } from '@utils/redact-secrets';

import * as receiptRepo from '@repositories/receipt.repository';

/**
 * MSG91 WhatsApp delivery reports (dashboard → WhatsApp → Webhook). The
 * outbound send only tells us MSG91 *accepted* the request (`whatsappStatus`
 * 'sent'); these callbacks are the only evidence of actual delivery, and are
 * stored separately in `whatsappDeliveryStatus`.
 *
 * MSG91's callback field names are not pinned in our code (they depend on the
 * webhook format chosen in the dashboard), so parsing is deliberately
 * tolerant: a single event or a batch, request id and status under their
 * common names. Anything unrecognised is ignored and logged by shape only.
 */

export type DeliveryReportStatus = 'sent' | 'delivered' | 'read' | 'failed';

/** Forward-only progression; `failed` may replace only sent/no report. */
const RANK: Record<DeliveryReportStatus, number> = { sent: 1, delivered: 2, read: 3, failed: 1.5 };
const MIN_SECRET_LENGTH = 16;
const META_ECOSYSTEM_LIMIT_CODE = '131049';

export function isDeliveryReportEndpointEnabled(): boolean {
  return (env.MSG91_WEBHOOK_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH;
}

/** Constant-time comparison against MSG91_WEBHOOK_SECRET. */
export function isAuthorizedDeliveryReport(provided: string | undefined): boolean {
  const secret = env.MSG91_WEBHOOK_SECRET;
  if (!provided || !secret || secret.length < MIN_SECRET_LENGTH) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function mapStatus(raw: unknown): DeliveryReportStatus | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (['delivered', 'delivery'].includes(value)) return 'delivered';
  if (['read', 'seen'].includes(value)) return 'read';
  if (['failed', 'failure', 'undelivered', 'rejected', 'error'].includes(value)) return 'failed';
  if (['sent', 'submitted', 'accepted'].includes(value)) return 'sent';
  return null;
}

function pick(item: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return item[key];
  }
  return undefined;
}

function events(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter((x) => x && typeof x === 'object');
  if (body && typeof body === 'object') {
    const data = (body as { data?: unknown }).data;
    if (Array.isArray(data)) return events(data);
    if (data && typeof data === 'object' && !pick(body as Record<string, unknown>, ['status'])) {
      return [data as Record<string, unknown>];
    }
    return [body as Record<string, unknown>];
  }
  return [];
}

function failureReason(item: Record<string, unknown>): string | null {
  const code = pick(item, ['errorCode', 'error_code', 'code']);
  const text = pick(item, [
    'reason',
    'failureReason',
    'failure_reason',
    'errorMessage',
    'error',
    'description',
  ]);
  const serialized = JSON.stringify(item);
  const parts = [
    serialized.includes(META_ECOSYSTEM_LIMIT_CODE)
      ? `Meta ${META_ECOSYSTEM_LIMIT_CODE}: WhatsApp declined delivery to this recipient (engagement limit).`
      : null,
    code !== undefined ? `code ${String(code)}` : null,
    typeof text === 'string' ? text : null,
  ].filter(Boolean);
  if (parts.length === 0) return 'Delivery failed (reported by provider)';
  const reason = redactSecrets(`Delivery report: ${parts.join(' — ')}`);
  return reason.length <= 500 ? reason : `${reason.slice(0, 499)}…`;
}

export interface DeliveryReportResult {
  applied: number;
  ignored: number;
}

export async function processWhatsAppDeliveryReport(body: unknown): Promise<DeliveryReportResult> {
  let applied = 0;
  let ignored = 0;

  for (const item of events(body)) {
    const requestId = pick(item, ['requestId', 'request_id', 'uuid', 'messageId', 'message_id']);
    const status = mapStatus(pick(item, ['status', 'eventName', 'event', 'messageStatus']));
    if (typeof requestId !== 'string' || !status) {
      ignored += 1;
      logger.warn('MSG91 delivery report ignored — unrecognised shape', {
        keys: Object.keys(item).slice(0, 20),
      });
      continue;
    }

    const receipt = await receiptRepo.findByWhatsappMessageId(requestId);
    if (!receipt) {
      ignored += 1;
      continue;
    }

    const lowerRanked = (Object.keys(RANK) as DeliveryReportStatus[]).filter(
      (s) => RANK[s] < RANK[status],
    );
    const moved = await receiptRepo.applyWhatsappDeliveryReport(
      receipt.id,
      status,
      lowerRanked,
      status === 'failed' ? failureReason(item) : null,
    );
    if (moved) {
      applied += 1;
      logger.info('WhatsApp delivery report applied', { receiptId: receipt.id, status });
    } else {
      ignored += 1; // duplicate, or would move the status backwards
    }
  }

  return { applied, ignored };
}
