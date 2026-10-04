import { Prisma } from '@prisma/client';
import type { SmsDeliveryStatus } from '@prisma/client';

import { env, notificationsMode } from '@config/env';
import { uploadBuffer } from '@integrations/storage/cloudinary-upload';
import { sendMail } from '@integrations/email/mailer';
import {
  donationReceiptEmail,
  donationReportEmail,
} from '@integrations/email/templates/donation.templates';
import { sendSms, type ReceiptSmsVariables } from '@integrations/sms/sms.service';
import { sendWhatsAppReceipt } from '@integrations/whatsapp/whatsapp.service';
import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { maskEmail, maskPhone } from '@utils/pii-mask';
import { ApiError } from '@utils/api-error';

import * as receiptRepo from '@repositories/receipt.repository';
import * as siteSettingsRepo from '@repositories/site-settings.repository';
import { generateReceiptPdf } from '@services/receipt-pdf.service';
import type { ReceiptWithDonation } from '@repositories/receipt.repository';

const BUSINESS_NAME = 'Sai Yadadri Seva Ashram';
const ORG_WEBSITE = 'https://sysa.in';
const PDF_RETRY_ATTEMPTS = 3;
const DELIVERY_RETRY_ATTEMPTS = 3;
const DELAYED_RETRY_MS = 12_000;

type DeliveryStatus = SmsDeliveryStatus;

interface ChannelResult {
  status: DeliveryStatus;
  messageId?: string | null;
  failureReason?: string | null;
}

/**
 * Shared by `issueReceipt` (first attempt) and `retryReceiptSms` (manual
 * retry) so both ever send exactly the same 3 values for exactly the same
 * message. MSG91's Flow API is DLT-templated: the actual wording ("Dear Sri
 * [Name] Garu, ... towards [Category] of ₹[Amount] ...") lives server-side
 * as an already-approved template, not as freeform text this backend
 * constructs — a send only supplies the template's declared variables, so
 * this returns exactly those 3, never PAN/Aadhaar/receipt links/secrets.
 */
function buildReceiptSmsVariables(receipt: ReceiptWithDonation): ReceiptSmsVariables {
  return {
    donorName: receipt.donation.donor.name,
    category: receipt.donation.category.nameEn,
    amount: Number(receipt.donation.amount).toLocaleString('en-IN'),
  };
}

function formatAmountInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
}

function formatDonationDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Date + time in IST for the organisation report. */
function formatDonationDateTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const DRY_RUN_REASON = 'Not sent: notifications are in dry-run mode (NOTIFICATIONS_MODE)';

/** Checked after a channel is claimed, right before any provider call, so a
 * dry run still exercises claiming/idempotency but never contacts a provider. */
function isDryRun(): boolean {
  return notificationsMode() === 'dry_run';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFailedStatus(status: DeliveryStatus | null | undefined): boolean {
  return status === 'failed' || status === 'not_configured';
}

async function withTransientRetries(
  attempt: () => Promise<ChannelResult>,
  attempts = DELIVERY_RETRY_ATTEMPTS,
): Promise<ChannelResult> {
  let result = await attempt();
  for (let i = 1; i < attempts && result.status === 'failed'; i += 1) {
    await sleep(300 * i);
    result = await attempt();
  }
  return result;
}

function scheduleReceiptDeliveryRetry(donationId: string): void {
  const timer = setTimeout(() => {
    void issueReceipt(donationId, { scheduleRetry: false, retryPending: true });
  }, DELAYED_RETRY_MS);
  timer.unref();
}

async function loadReceipt(donationId: string): Promise<ReceiptWithDonation | null> {
  const existing = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (existing) return existing;

  try {
    await receiptRepo.createForDonation(donationId);
  } catch (error) {
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    if (!isDuplicate) {
      logger.error('Failed to create receipt row', {
        donationId,
        error: error instanceof Error ? error.message : error,
      });
      return receiptRepo.findByDonationIdWithDonation(donationId);
    }
  }

  return receiptRepo.findByDonationIdWithDonation(donationId);
}

async function buildPdfBuffer(receipt: ReceiptWithDonation): Promise<Buffer> {
  const settings = await siteSettingsRepo.get();
  const donor = receipt.donation.donor;
  const donationDate = receipt.donation.completedAt ?? receipt.donation.createdAt;
  const subscription = receipt.donation.subscription;
  return generateReceiptPdf({
    receiptNumber: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    donorName: donor.name,
    donorPhone: donor.phone,
    donorEmail: donor.email,
    donorAddress: donor.address,
    donorCity: donor.city,
    donorPincode: donor.pincode,
    donorState: donor.state,
    panNumberMasked: donor.panNumberMasked,
    aadhaarNumberMasked: donor.aadhaarNumberMasked,
    categoryName: receipt.donation.category.nameEn,
    amount: receipt.donation.amount,
    currency: receipt.donation.currency,
    paymentMethod: receipt.donation.paymentMethod,
    paymentReference: receipt.donation.paymentGatewayRef,
    razorpayOrderId: receipt.donation.razorpayOrderId,
    donationDate,
    orgAddress: settings?.contactAddressEn ?? null,
    orgPhone: settings?.contactPhone ?? null,
    orgEmail: settings?.contactEmail ?? null,
    orgWebsite: ORG_WEBSITE,
    upiId: settings?.upiId ?? null,
    monthlyContribution: subscription
      ? {
          contributionPeriod: donationDate.toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric',
          }),
          razorpaySubscriptionId: subscription.razorpaySubscriptionId,
        }
      : null,
  });
}

async function fetchPdfBuffer(pdfUrl: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(pdfUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

async function ensurePdf(
  receipt: ReceiptWithDonation,
): Promise<{ receipt: ReceiptWithDonation; pdfBuffer: Buffer } | null> {
  if (receipt.pdfUrl) {
    try {
      const pdfBuffer = await fetchPdfBuffer(receipt.pdfUrl);
      if (!receipt.receiptGeneratedAt) {
        await receiptRepo.markGenerated(receipt.id);
      }
      return { receipt, pdfBuffer };
    } catch (error) {
      logger.warn('Stored receipt PDF could not be fetched — regenerating', {
        donationId: receipt.donationId,
        receiptId: receipt.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  let pdfBuffer: Buffer | null = null;
  for (let attempt = 1; attempt <= PDF_RETRY_ATTEMPTS; attempt += 1) {
    try {
      pdfBuffer = await buildPdfBuffer(receipt);
      break;
    } catch (error) {
      logger.error('Receipt PDF generation failed', {
        donationId: receipt.donationId,
        receiptId: receipt.id,
        attempt,
        error: error instanceof Error ? error.message : error,
      });
      if (attempt < PDF_RETRY_ATTEMPTS) {
        await sleep(300 * attempt);
      }
    }
  }
  if (!pdfBuffer) return null;

  await receiptRepo.markGenerated(receipt.id);

  try {
    const upload = await uploadBuffer(pdfBuffer, {
      folder: 'sysa/receipts',
      resourceType: 'raw',
    });
    await receiptRepo.updatePdfUrl(receipt.id, upload.url);
    const withDonation = await receiptRepo.findByDonationIdWithDonation(receipt.donationId);
    if (withDonation) {
      await writeAuditLog({
        action: 'RECEIPT_GENERATED',
        entityType: 'receipt',
        entityId: receipt.id,
        afterState: { donationId: receipt.donationId, receiptNumber: receipt.receiptNumber },
      });
      return { receipt: withDonation, pdfBuffer };
    }
  } catch (error) {
    logger.error('Receipt PDF upload failed — email can still attach the in-memory PDF', {
      donationId: receipt.donationId,
      receiptId: receipt.id,
      error: error instanceof Error ? error.message : error,
    });
  }

  const refreshed = (await receiptRepo.findByDonationIdWithDonation(receipt.donationId)) ?? receipt;
  return { receipt: refreshed, pdfBuffer };
}

function receiptFilename(receiptNumber: string): string {
  return `Payment-Receipt-${receiptNumber}.pdf`;
}

async function deliverEmail(
  receipt: ReceiptWithDonation,
  pdfBuffer: Buffer,
  force: boolean,
): Promise<DeliveryStatus | null> {
  const donor = receipt.donation.donor;
  if (!donor.email) return null;
  if (!force && receipt.emailStatus === 'sent') return 'sent';
  if (pdfBuffer.length === 0) {
    await receiptRepo.updateEmailDelivery(receipt.id, {
      status: 'failed',
      failureReason: 'Receipt PDF could not be generated',
    });
    return 'failed';
  }

  const claimed = await receiptRepo.claimEmailSend(receipt.id, force);
  if (!claimed) {
    const latest = await receiptRepo.findByDonationIdWithDonation(receipt.donationId);
    return latest?.emailStatus ?? receipt.emailStatus ?? 'pending';
  }

  if (isDryRun()) {
    await receiptRepo.updateEmailDelivery(receipt.id, {
      status: 'not_configured',
      failureReason: DRY_RUN_REASON,
    });
    logger.info('Email skipped (dry run)', {
      donationId: receipt.donationId,
      receiptId: receipt.id,
    });
    return 'not_configured';
  }

  const donationDate = receipt.donation.completedAt ?? receipt.donation.createdAt;
  const settings = await siteSettingsRepo.get();
  const email = donationReceiptEmail({
    donorName: donor.name,
    amount: Number(receipt.donation.amount),
    currency: receipt.donation.currency,
    categoryName: receipt.donation.category.nameEn,
    receiptNumber: receipt.receiptNumber,
    receiptUrl: receipt.pdfUrl,
    donationDate: formatDonationDate(donationDate),
    paymentId: receipt.donation.paymentGatewayRef,
    orderId: receipt.donation.razorpayOrderId ?? receipt.donationId,
    orgPhone: settings?.contactPhone ?? null,
    orgEmail: settings?.contactEmail ?? null,
    orgWebsite: ORG_WEBSITE,
    businessName: BUSINESS_NAME,
  });

  logger.info('Email attempt started', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    receiptNumber: receipt.receiptNumber,
    to: maskEmail(donor.email),
  });

  const result = await withTransientRetries(() =>
    sendMail({
      to: donor.email as string,
      ...email,
      attachments: [
        {
          filename: receiptFilename(receipt.receiptNumber),
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    }),
  );

  await receiptRepo.updateEmailDelivery(receipt.id, {
    status: result.status,
    messageId: result.messageId,
    failureReason: result.failureReason,
  });
  logger.info('Email attempt finished', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    result: result.status,
  });
  return result.status;
}

/**
 * Organisation report email (ORG_RECEIPT_EMAIL) for every verified donation,
 * independent of whether the donor gave an email. Carries the same receipt
 * number/amount/PDF as the donor channels; PAN/Aadhaar appear only in their
 * stored masked form.
 */
async function deliverOrgEmail(
  receipt: ReceiptWithDonation,
  pdfBuffer: Buffer,
  force: boolean,
): Promise<DeliveryStatus> {
  if (!force && receipt.orgEmailStatus === 'sent') return 'sent';

  const claimed = await receiptRepo.claimOrgEmailSend(receipt.id, force);
  if (!claimed) {
    const latest = await receiptRepo.findByDonationIdWithDonation(receipt.donationId);
    return latest?.orgEmailStatus ?? receipt.orgEmailStatus ?? 'pending';
  }

  if (isDryRun()) {
    await receiptRepo.updateOrgEmailDelivery(receipt.id, {
      status: 'not_configured',
      failureReason: DRY_RUN_REASON,
    });
    logger.info('Org email skipped (dry run)', {
      donationId: receipt.donationId,
      receiptId: receipt.id,
    });
    return 'not_configured';
  }

  const donor = receipt.donation.donor;
  const donationDate = receipt.donation.completedAt ?? receipt.donation.createdAt;
  const address = [donor.address, donor.city, donor.state, donor.pincode]
    .filter((part): part is string => !!part && part.trim() !== '')
    .join(', ');
  const email = donationReportEmail({
    donorName: donor.name,
    amount: Number(receipt.donation.amount),
    currency: receipt.donation.currency,
    categoryName: receipt.donation.category.nameEn,
    receiptNumber: receipt.receiptNumber,
    paymentId: receipt.donation.paymentGatewayRef,
    orderId: receipt.donation.razorpayOrderId,
    donationDateTime: formatDonationDateTime(donationDate),
    donorEmail: donor.email,
    donorPhone: donor.phone,
    donorAddress: address || null,
    panNumberMasked: donor.panNumberMasked,
    aadhaarNumberMasked: donor.aadhaarNumberMasked,
  });

  logger.info('Org email attempt started', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    receiptNumber: receipt.receiptNumber,
    to: maskEmail(env.ORG_RECEIPT_EMAIL),
  });

  const result = await withTransientRetries(() =>
    sendMail({
      to: env.ORG_RECEIPT_EMAIL,
      ...email,
      attachments:
        pdfBuffer.length > 0
          ? [
              {
                filename: receiptFilename(receipt.receiptNumber),
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
    }),
  );

  await receiptRepo.updateOrgEmailDelivery(receipt.id, {
    status: result.status,
    messageId: result.messageId,
    failureReason: result.failureReason,
  });
  logger.info('Org email attempt finished', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    result: result.status,
  });
  return result.status;
}

async function deliverWhatsApp(
  receipt: ReceiptWithDonation,
  force: boolean,
): Promise<DeliveryStatus | null> {
  const donor = receipt.donation.donor;
  if (!donor.phone) return null;
  if (!force && receipt.whatsappStatus === 'sent') return 'sent';

  const claimed = await receiptRepo.claimWhatsappSend(receipt.id, force);
  if (!claimed) {
    const latest = await receiptRepo.findByDonationIdWithDonation(receipt.donationId);
    return latest?.whatsappStatus ?? receipt.whatsappStatus ?? 'pending';
  }

  if (isDryRun()) {
    await receiptRepo.updateWhatsappDelivery(receipt.id, {
      status: 'not_configured',
      failureReason: DRY_RUN_REASON,
    });
    logger.info('WhatsApp skipped (dry run)', {
      donationId: receipt.donationId,
      receiptId: receipt.id,
    });
    return 'not_configured';
  }

  const donationDate = receipt.donation.completedAt ?? receipt.donation.createdAt;
  logger.info('WhatsApp attempt started', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    receiptNumber: receipt.receiptNumber,
    to: maskPhone(donor.phone),
  });

  const result = await withTransientRetries(() =>
    sendWhatsAppReceipt({
      to: donor.phone,
      customerName: donor.name,
      amountFormatted: formatAmountInr(Number(receipt.donation.amount)),
      receiptNumber: receipt.receiptNumber,
      donationDate: formatDonationDate(donationDate),
      paymentId: receipt.donation.paymentGatewayRef,
      documentUrl: receipt.pdfUrl,
      filename: receiptFilename(receipt.receiptNumber),
    }),
  );

  await receiptRepo.updateWhatsappDelivery(receipt.id, {
    status: result.status,
    messageId: result.messageId,
    failureReason: result.failureReason,
  });
  logger.info('WhatsApp attempt finished', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    result: result.status,
  });
  return result.status;
}

async function deliverSms(
  receipt: ReceiptWithDonation,
  force: boolean,
): Promise<DeliveryStatus | null> {
  const donor = receipt.donation.donor;
  if (!donor.phone) return null;
  if (!force && receipt.smsStatus === 'sent') return 'sent';

  // Same atomic claim as email/WhatsApp: a verify + webhook race must not
  // send the SMS twice.
  const claimed = await receiptRepo.claimSmsSend(receipt.id, force);
  if (!claimed) {
    const latest = await receiptRepo.findByDonationIdWithDonation(receipt.donationId);
    return latest?.smsStatus ?? receipt.smsStatus ?? 'pending';
  }

  if (isDryRun()) {
    await receiptRepo.updateSmsStatus(receipt.id, 'not_configured');
    logger.info('SMS skipped (dry run)', { donationId: receipt.donationId, receiptId: receipt.id });
    return 'not_configured';
  }

  logger.info('SMS attempt started', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    receiptNumber: receipt.receiptNumber,
    to: maskPhone(donor.phone),
  });
  const smsResult = await sendSms(donor.phone, buildReceiptSmsVariables(receipt));
  await receiptRepo.updateSmsStatus(receipt.id, smsResult);
  logger.info('SMS attempt finished', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    result: smsResult,
  });
  return smsResult;
}

export interface IssueReceiptOptions {
  /** When false, a failed delivery will not schedule another delayed retry
   * (used by the delayed retry itself and by manual retry endpoints). */
  scheduleRetry?: boolean;
  /** Allow a delayed retry to re-attempt a channel left `pending` after a crash. */
  retryPending?: boolean;
}

/**
 * Ensures a donation has both a `Receipt` row and a generated PDF, then
 * delivers that PDF by email and WhatsApp (and the existing SMS notice).
 * The single entry point every donation-completion path (online
 * verify/webhook, manual entry, bank-transfer verification) should use.
 *
 * PDF generation and channel delivery never throw to the caller — a captured
 * payment stays captured even if a channel is down. Failures are logged,
 * retried in-process, optionally retried once more after a short delay, and
 * recorded on the receipt row so Finance can retry manually.
 */
export async function issueReceipt(
  donationId: string,
  options: IssueReceiptOptions = {},
): Promise<ReceiptWithDonation | null> {
  const scheduleRetry = options.scheduleRetry !== false;
  const forcePending = options.retryPending === true;

  try {
    const receipt = await loadReceipt(donationId);
    if (!receipt) {
      logger.error('Receipt row missing after create — skipping delivery', { donationId });
      if (scheduleRetry) scheduleReceiptDeliveryRetry(donationId);
      return null;
    }

    const pdf = await ensurePdf(receipt);
    if (!pdf || pdf.pdfBuffer.length === 0) {
      logger.error('Receipt PDF generation/upload failed — receipt row still created', {
        donationId,
        receiptId: receipt.id,
      });
      if (scheduleRetry) scheduleReceiptDeliveryRetry(donationId);
      return receipt;
    }

    const current = (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? pdf.receipt;
    const emailStatus = await deliverEmail(current, pdf.pdfBuffer, forcePending);
    const afterEmail = (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? current;
    const orgEmailStatus = await deliverOrgEmail(afterEmail, pdf.pdfBuffer, forcePending);
    const afterOrgEmail =
      (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? afterEmail;
    const whatsappStatus = await deliverWhatsApp(afterOrgEmail, forcePending);
    const afterWhatsApp =
      (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? afterOrgEmail;
    const smsStatus = await deliverSms(afterWhatsApp, forcePending);

    // A dry run records every channel as not sent on purpose — retrying it
    // would only repeat the same no-op.
    if (
      scheduleRetry &&
      !isDryRun() &&
      (isFailedStatus(emailStatus) ||
        isFailedStatus(orgEmailStatus) ||
        isFailedStatus(whatsappStatus) ||
        isFailedStatus(smsStatus) ||
        emailStatus === 'pending' ||
        orgEmailStatus === 'pending' ||
        whatsappStatus === 'pending')
    ) {
      scheduleReceiptDeliveryRetry(donationId);
    }

    return receiptRepo.findByDonationIdWithDonation(donationId);
  } catch (error) {
    logger.error('Receipt issuance failed — payment is unaffected', {
      donationId,
      error: error instanceof Error ? error.message : error,
    });
    if (scheduleRetry) scheduleReceiptDeliveryRetry(donationId);
    return receiptRepo.findByDonationIdWithDonation(donationId);
  }
}

/**
 * Re-attempts the receipt SMS for an already-completed donation — retry_sms
 * requirement. Never creates a donation, receipt, or Razorpay charge: it
 * only re-sends against the existing `Receipt` row, using the donor's
 * already-stored mobile number. The route layer is responsible for
 * rate-limiting repeated calls (donation-checkout.routes.ts).
 */
export async function retryReceiptSms(donationId: string): Promise<DeliveryStatus> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');
  if (receipt.smsStatus === 'sent') return 'sent';

  const result = await deliverSms(receipt, true);
  if (!result) throw ApiError.badRequest('No mobile number is on file for this donor.');
  return result;
}

export async function retryReceiptEmail(donationId: string): Promise<DeliveryStatus> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');
  if (!receipt.donation.donor.email) {
    throw ApiError.badRequest('No email address is on file for this donor.');
  }
  if (receipt.emailStatus === 'sent') return 'sent';

  const pdfBuffer = await loadPdfForRetry(receipt);
  const result = await deliverEmail(
    (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? receipt,
    pdfBuffer,
    true,
  );
  return result ?? 'failed';
}

/** Stored PDF if still fetchable, otherwise regenerated — same receipt number. */
async function loadPdfForRetry(receipt: ReceiptWithDonation): Promise<Buffer> {
  if (receipt.pdfUrl) {
    try {
      const stored = await fetchPdfBuffer(receipt.pdfUrl);
      if (stored.length > 0) return stored;
    } catch {
      // fall through to regeneration
    }
  }
  const regenerated = await ensurePdf(receipt);
  if (!regenerated || regenerated.pdfBuffer.length === 0) {
    throw ApiError.conflict('Receipt is still being generated. Please try again in a moment.');
  }
  return regenerated.pdfBuffer;
}

export async function retryReceiptOrgEmail(donationId: string): Promise<DeliveryStatus> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');
  if (receipt.orgEmailStatus === 'sent') return 'sent';

  const pdfBuffer = await loadPdfForRetry(receipt);
  return deliverOrgEmail(
    (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? receipt,
    pdfBuffer,
    true,
  );
}

export async function retryReceiptWhatsApp(donationId: string): Promise<DeliveryStatus> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');
  if (!receipt.donation.donor.phone) {
    throw ApiError.badRequest('No mobile number is on file for this donor.');
  }
  if (receipt.whatsappStatus === 'sent') return 'sent';

  if (!receipt.pdfUrl) {
    await ensurePdf(receipt);
  }

  const latest = (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? receipt;
  const result = await deliverWhatsApp(latest, true);
  if (!result) throw ApiError.badRequest('No mobile number is on file for this donor.');
  return result;
}

export async function retryFailedDeliveries(donationId: string): Promise<{
  emailStatus: DeliveryStatus | null;
  whatsappStatus: DeliveryStatus | null;
}> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');

  let emailStatus: DeliveryStatus | null = receipt.emailStatus;
  let whatsappStatus: DeliveryStatus | null = receipt.whatsappStatus;

  if (receipt.donation.donor.email && receipt.emailStatus !== 'sent') {
    emailStatus = await retryReceiptEmail(donationId);
  }
  if (receipt.donation.donor.phone && receipt.whatsappStatus !== 'sent') {
    whatsappStatus = await retryReceiptWhatsApp(donationId);
  }
  // The organisation copy rides along on any retry; its status is internal,
  // so the donor-facing response shape is unchanged.
  if (receipt.orgEmailStatus !== 'sent') {
    await retryReceiptOrgEmail(donationId);
  }

  return { emailStatus, whatsappStatus };
}
