import { prisma } from '@lib/prisma';
import { Prisma } from '@prisma/client';
import type { SmsDeliveryStatus } from '@prisma/client';

const withDonationInclude = {
  donation: { include: { donor: true, category: true, subscription: true } },
} satisfies Prisma.ReceiptInclude;

/** Shared shape returned by `findByIdWithDonation`/`findByDonationIdWithDonation`
 * — exported so services (receipt.service.ts's SMS message builder) can type
 * against it without duplicating the include shape. */
export type ReceiptWithDonation = Prisma.ReceiptGetPayload<{ include: typeof withDonationInclude }>;

export function findByDonationId(donationId: string) {
  return prisma.receipt.findUnique({ where: { donationId } });
}

/** Includes everything the PDF generator needs to render a receipt in one
 * round trip — see services/receipt.service.ts. */
export function findByIdWithDonation(id: string) {
  return prisma.receipt.findUnique({ where: { id }, include: withDonationInclude });
}

export function findByDonationIdWithDonation(donationId: string) {
  return prisma.receipt.findUnique({ where: { donationId }, include: withDonationInclude });
}

export function updatePdfUrl(id: string, pdfUrl: string) {
  return prisma.receipt.update({
    where: { id },
    data: { pdfUrl, receiptGeneratedAt: new Date() },
  });
}

export function markGenerated(id: string) {
  return prisma.receipt.update({
    where: { id },
    data: { receiptGeneratedAt: new Date() },
  });
}

export function updateSmsStatus(id: string, smsStatus: SmsDeliveryStatus) {
  return prisma.receipt.update({ where: { id }, data: { smsStatus } });
}

export interface EmailDeliveryUpdate {
  status: SmsDeliveryStatus;
  messageId?: string | null;
  failureReason?: string | null;
}

export interface WhatsAppDeliveryUpdate {
  status: SmsDeliveryStatus;
  messageId?: string | null;
  failureReason?: string | null;
}

export function updateEmailDelivery(id: string, update: EmailDeliveryUpdate) {
  return prisma.receipt.update({
    where: { id },
    data: {
      emailStatus: update.status,
      emailMessageId: update.messageId ?? undefined,
      emailFailureReason: update.status === 'sent' ? null : (update.failureReason ?? null),
      emailSentAt: update.status === 'sent' ? new Date() : undefined,
    },
  });
}

export function updateWhatsappDelivery(id: string, update: WhatsAppDeliveryUpdate) {
  return prisma.receipt.update({
    where: { id },
    data: {
      whatsappStatus: update.status,
      whatsappMessageId: update.messageId ?? undefined,
      whatsappFailureReason: update.status === 'sent' ? null : (update.failureReason ?? null),
      whatsappSentAt: update.status === 'sent' ? new Date() : undefined,
    },
  });
}

export function updateOrgEmailDelivery(id: string, update: EmailDeliveryUpdate) {
  return prisma.receipt.update({
    where: { id },
    data: {
      orgEmailStatus: update.status,
      orgEmailMessageId: update.messageId ?? undefined,
      orgEmailFailureReason: update.status === 'sent' ? null : (update.failureReason ?? null),
      orgEmailSentAt: update.status === 'sent' ? new Date() : undefined,
    },
  });
}

export function updateEmailStatus(id: string, emailStatus: SmsDeliveryStatus) {
  return updateEmailDelivery(id, { status: emailStatus });
}

export function updateWhatsappStatus(id: string, whatsappStatus: SmsDeliveryStatus) {
  return updateWhatsappDelivery(id, { status: whatsappStatus });
}

const retryableStatuses: SmsDeliveryStatus[] = ['failed', 'not_configured'];

function claimWhere(
  id: string,
  field: 'emailStatus' | 'whatsappStatus' | 'orgEmailStatus' | 'smsStatus',
  force: boolean,
): Prisma.ReceiptWhereInput {
  if (force) {
    return {
      id,
      OR: [{ [field]: null }, { [field]: { not: 'sent' } }],
    };
  }
  return {
    id,
    OR: [{ [field]: null }, { [field]: { in: retryableStatuses } }],
  };
}

/** Atomically marks a channel `pending` so verify + webhook cannot double-send. */
export async function claimEmailSend(id: string, force: boolean): Promise<boolean> {
  const result = await prisma.receipt.updateMany({
    where: claimWhere(id, 'emailStatus', force),
    data: { emailStatus: 'pending', emailFailureReason: null },
  });
  return result.count > 0;
}

export async function claimWhatsappSend(id: string, force: boolean): Promise<boolean> {
  const result = await prisma.receipt.updateMany({
    where: claimWhere(id, 'whatsappStatus', force),
    data: { whatsappStatus: 'pending', whatsappFailureReason: null },
  });
  return result.count > 0;
}

export async function claimOrgEmailSend(id: string, force: boolean): Promise<boolean> {
  const result = await prisma.receipt.updateMany({
    where: claimWhere(id, 'orgEmailStatus', force),
    data: { orgEmailStatus: 'pending', orgEmailFailureReason: null },
  });
  return result.count > 0;
}

export async function claimSmsSend(id: string, force: boolean): Promise<boolean> {
  const result = await prisma.receipt.updateMany({
    where: claimWhere(id, 'smsStatus', force),
    data: { smsStatus: 'pending' },
  });
  return result.count > 0;
}

/** Sequential, auditable receipt numbers — "RCPT-2026-000123" — per
 * documentation/08-Database-Requirements.md §3.4 ("stores generated receipt
 * number, sequential, auditable"). */
export async function generateReceiptNumber(): Promise<string> {
  const prefix = `RCPT-${new Date().getFullYear()}-`;
  // Next after the highest issued number (zero-padded, so string order is
  // numeric order) rather than `count + 1`, which would re-issue an existing
  // number forever once any receipt row is removed.
  const latest = await prisma.receipt.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  });
  const last = latest ? Number.parseInt(latest.receiptNumber.slice(prefix.length), 10) : 0;
  const sequence = String((Number.isFinite(last) ? last : 0) + 1).padStart(6, '0');
  return `${prefix}${sequence}`;
}

const RECEIPT_NUMBER_ATTEMPTS = 5;

function isReceiptNumberCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2002') return false;
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return fields.includes('receipt_number') || fields.includes('receiptNumber');
}

/** Two payments completing at the same moment can both read the same
 * `count` and compute the same next number. The unique index rejects the
 * loser; it retries with a fresh count. A `donation_id` collision (the same
 * donation twice) is NOT retried — it propagates as P2002 so the caller
 * knows the donation already has its one receipt. */
export async function createForDonation(donationId: string, pdfUrl?: string) {
  for (let attempt = 1; ; attempt += 1) {
    const receiptNumber = await generateReceiptNumber();
    try {
      return await prisma.receipt.create({
        data: {
          donationId,
          receiptNumber,
          pdfUrl,
          receiptGeneratedAt: pdfUrl ? new Date() : undefined,
        },
      });
    } catch (error) {
      if (attempt >= RECEIPT_NUMBER_ATTEMPTS || !isReceiptNumberCollision(error)) throw error;
    }
  }
}
