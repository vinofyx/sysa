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
import {
  sendWhatsAppReceipt,
  templateNeedsDocument,
} from '@integrations/whatsapp/whatsapp.service';
import { receiptMedia } from '@integrations/storage/receipt-media';
import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { buildReceiptDownloadUrl } from '@lib/receipt-link';
import { maskEmail, maskPhone } from '@utils/pii-mask';
import { ApiError } from '@utils/api-error';

import * as receiptRepo from '@repositories/receipt.repository';
import * as siteSettingsRepo from '@repositories/site-settings.repository';
import {
  formatPaymentMethod,
  formatReceiptDate,
  generateReceiptPdf,
} from '@services/receipt-pdf.service';
import * as donationRepo from '@repositories/donation.repository';
import { receiptRecipients } from '@services/receipt-recipients';
import type { ReceiptWithDonation } from '@repositories/receipt.repository';

const BUSINESS_NAME = 'Sai Yadadri Seva Ashram';
const ORG_WEBSITE = 'https://sysa.in';
const PDF_RETRY_ATTEMPTS = 3;
const DELIVERY_RETRY_ATTEMPTS = 3;
/** Durable retry backoff (attempt n waits RETRY_BACKOFF_MS[n]); its length
 * is the attempt cap. Persisted on the receipt row, so a restart never
 * loses a pending retry (see jobs/delivery-retry.worker.ts). */
export const RETRY_BACKOFF_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  3 * 3_600_000,
  6 * 3_600_000,
];
/** While a delivery is running, the receipt holds a short lease so a crash
 * mid-send is still retried by the worker. */
const IN_FLIGHT_LEASE_MS = 2 * 60_000;

type DeliveryStatus = SmsDeliveryStatus;

interface ChannelResult {
  status: DeliveryStatus;
  messageId?: string | null;
  failureReason?: string | null;
  permanent?: boolean;
}

/** Prefix stored on a channel's failure reason when the provider rejected it
 * permanently (e.g. Meta 131049). Automatic paths — page refreshes of
 * /verify, Razorpay webhook retries, the delayed retry — never resend such a
 * message; only an explicit admin resend can. */
const NO_AUTO_RETRY_PREFIX = '[not retried automatically] ';

function isPermanentFailure(reason: string | null | undefined): boolean {
  return typeof reason === 'string' && reason.startsWith(NO_AUTO_RETRY_PREFIX);
}

/** Failure reason as persisted: permanent rejections carry the marker. */
function storedReason(result: ChannelResult): string | null | undefined {
  return result.permanent && result.failureReason
    ? `${NO_AUTO_RETRY_PREFIX}${result.failureReason}`
    : result.failureReason;
}

/** A channel that failed permanently — automatic paths must leave it alone. */
function blockedPermanently(
  status: DeliveryStatus | null | undefined,
  reason: string | null | undefined,
): boolean {
  return status === 'failed' && isPermanentFailure(reason);
}

/** Worth an automatic retry: a transient `failed`. Not `not_configured`
 * (retrying cannot fix configuration — resend after fixing it), not
 * `skipped`, and never a permanent rejection. */
function autoRetryable(
  status: DeliveryStatus | null | undefined,
  reason: string | null | undefined,
): boolean {
  return status === 'failed' && !isPermanentFailure(reason);
}

/** Resends carry a "Paid Successfully" receipt — refuse them once the
 * donation is no longer completed (e.g. refunded). */
function assertPaymentCompleted(receipt: ReceiptWithDonation): void {
  if (receipt.donation.status !== 'completed') {
    throw ApiError.conflict(
      'This donation is not a completed payment, so its receipt cannot be sent.',
    );
  }
}

export interface ResendOptions {
  /** Admin-only: resend even a permanently rejected message. */
  overridePermanent?: boolean;
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
    receiptNumber: receipt.receiptNumber,
  };
}

function formatAmountInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
}

/** Same IST date the PDF prints — never the server's own timezone. */
function formatDonationDate(date: Date): string {
  return formatReceiptDate(date);
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

/** A channel deliberately held back by a dry run — not a delivery failure,
 * even after NOTIFICATIONS_MODE has since been switched to live. */
export function heldByDryRun(
  status: DeliveryStatus | null | undefined,
  reason: string | null | undefined,
): boolean {
  return status === 'not_configured' && reason === DRY_RUN_REASON;
}

/** Checked after a channel is claimed, right before any provider call, so a
 * dry run still exercises claiming/idempotency but never contacts a provider. */
function isDryRun(): boolean {
  return notificationsMode() === 'dry_run';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientRetries(
  attempt: () => Promise<ChannelResult>,
  attempts = DELIVERY_RETRY_ATTEMPTS,
): Promise<ChannelResult> {
  let result = await attempt();
  for (let i = 1; i < attempts && result.status === 'failed' && !result.permanent; i += 1) {
    await sleep(300 * i);
    result = await attempt();
  }
  return result;
}

/** Schedules the next durable retry with backoff, or stops once the attempt
 * cap is reached (channels stay recorded as failed for an admin resend). */
async function scheduleReceiptDeliveryRetry(donationId: string): Promise<void> {
  try {
    const receipt = await receiptRepo.findByDonationId(donationId);
    if (!receipt) return; // no row yet — the worker's missing-receipt scan covers it
    const attempt = receipt.deliveryRetryCount;
    if (attempt >= RETRY_BACKOFF_MS.length) {
      await receiptRepo.setNextDeliveryRetry(donationId, null);
      logger.warn('Receipt delivery retries exhausted — admin resend required', {
        donationId,
        receiptId: receipt.id,
        attempts: attempt,
      });
      return;
    }
    await receiptRepo.setNextDeliveryRetry(
      donationId,
      new Date(Date.now() + RETRY_BACKOFF_MS[attempt]),
    );
  } catch (error) {
    logger.error('Failed to schedule receipt delivery retry', {
      donationId,
      error: error instanceof Error ? error.message : error,
    });
  }
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
  const recipients = receiptRecipients(receipt.donation);
  const donationDate = receipt.donation.completedAt ?? receipt.donation.createdAt;
  const subscription = receipt.donation.subscription;
  return generateReceiptPdf({
    receiptNumber: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    donorName: donor.name,
    donorPhone: recipients.phone ?? '',
    donorEmail: recipients.email,
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

/** The receipt number is the document's name everywhere it is delivered:
 * email attachment, WhatsApp document and the website download. */
export function receiptFilename(receiptNumber: string): string {
  return `${receiptNumber}.pdf`;
}

/**
 * The website "Download Receipt" PDF: rendered on request from the stored,
 * verified receipt record, so it always uses the current layout — a copy
 * uploaded at issuance would freeze whatever layout existed then. Read-only:
 * no receipt row, receipt number, upload or delivery state is created or
 * changed, and only a completed donation's receipt can be downloaded.
 */
export async function renderReceiptPdfForDownload(
  donationId: string,
): Promise<{ filename: string; pdf: Buffer }> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt is not available yet.');
  assertPaymentCompleted(receipt);
  return { filename: receiptFilename(receipt.receiptNumber), pdf: await buildPdfBuffer(receipt) };
}

async function deliverEmail(
  receipt: ReceiptWithDonation,
  pdfBuffer: Buffer,
  force: boolean,
  options: ResendOptions = {},
): Promise<DeliveryStatus | null> {
  const donor = receipt.donation.donor;
  // The email entered with this donation (see receipt-recipients.ts).
  const recipientEmail = receiptRecipients(receipt.donation).email;
  if (!recipientEmail) {
    await receiptRepo.markChannelSkipped(
      receipt.id,
      'email',
      'No email address was provided for this donation',
    );
    return 'skipped';
  }
  if (!force && receipt.emailStatus === 'sent') return 'sent';
  // A permanently rejected address (e.g. SMTP 550) is not re-sent by page
  // refreshes, webhook retries or the delayed retry — only by an admin.
  if (
    !options.overridePermanent &&
    blockedPermanently(receipt.emailStatus, receipt.emailFailureReason)
  ) {
    return 'failed';
  }
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
    // The authenticated download endpoint, never the stored file URL (which
    // would freeze the layout the receipt was first rendered with).
    receiptUrl: buildReceiptDownloadUrl(receipt.donationId),
    donationDate: formatDonationDate(donationDate),
    paymentId: receipt.donation.paymentGatewayRef,
    orderId: receipt.donation.razorpayOrderId ?? receipt.donationId,
    donorPhoneMasked: (() => {
      const phone = receiptRecipients(receipt.donation).phone;
      return phone ? maskPhone(phone) : null;
    })(),
    panNumberMasked: donor.panNumberMasked,
    donorAddress: donor.address,
    donorCity: donor.city,
    donorState: donor.state,
    donorPincode: donor.pincode,
    paymentMethod: receipt.donation.paymentMethod
      ? formatPaymentMethod(receipt.donation.paymentMethod)
      : null,
    orgPhone: settings?.contactPhone ?? null,
    orgEmail: settings?.contactEmail ?? null,
    orgWebsite: ORG_WEBSITE,
    businessName: BUSINESS_NAME,
  });

  logger.info('Email attempt started', {
    donationId: receipt.donationId,
    receiptId: receipt.id,
    receiptNumber: receipt.receiptNumber,
    to: maskEmail(recipientEmail),
  });

  const result = await withTransientRetries(() =>
    sendMail({
      to: recipientEmail,
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
    failureReason: storedReason(result),
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
  options: ResendOptions = {},
): Promise<DeliveryStatus> {
  if (!force && receipt.orgEmailStatus === 'sent') return 'sent';
  if (
    !options.overridePermanent &&
    blockedPermanently(receipt.orgEmailStatus, receipt.orgEmailFailureReason)
  ) {
    return 'failed';
  }

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
    donorEmail: receiptRecipients(receipt.donation).email,
    donorPhone: receiptRecipients(receipt.donation).phone,
    donorAddress: address || null,
    panNumberMasked: donor.panNumberMasked,
    aadhaarNumberMasked: donor.aadhaarNumberMasked,
    receiptUrl: buildReceiptDownloadUrl(receipt.donationId),
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
    failureReason: storedReason(result),
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
  options: ResendOptions = {},
): Promise<DeliveryStatus | null> {
  const donor = receipt.donation.donor;
  const recipients = receiptRecipients(receipt.donation);
  if (!recipients.phone) {
    await receiptRepo.markChannelSkipped(receipt.id, 'whatsapp', 'No mobile number is on file');
    return 'skipped';
  }
  // No explicit opt-in (given with this donation) → WhatsApp is not part of
  // this receipt: no attempt, no retries, recorded as skipped with the reason.
  if (!recipients.whatsappConsent) {
    await receiptRepo.markChannelSkipped(
      receipt.id,
      'whatsapp',
      'Donor did not opt in to WhatsApp receipts',
    );
    return 'skipped';
  }
  if (recipients.phoneBlockedReason) {
    await receiptRepo.markChannelSkipped(receipt.id, 'whatsapp', recipients.phoneBlockedReason);
    return 'skipped';
  }
  const recipientPhone = recipients.phone;
  if (!force && receipt.whatsappStatus === 'sent') return 'sent';
  if (
    !options.overridePermanent &&
    blockedPermanently(receipt.whatsappStatus, receipt.whatsappFailureReason)
  ) {
    return 'failed';
  }

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
    to: maskPhone(recipientPhone),
  });

  // A document template carries the PDF itself: hand MSG91 a private,
  // expiring link to the PDF just generated from this receipt's record —
  // never the stored public file. Text templates need no link.
  let documentUrl: string | null = null;
  if (templateNeedsDocument()) {
    try {
      // Rendered now from the receipt's current record (same receipt number).
      documentUrl = await receiptMedia.createUrl(
        await buildPdfBuffer(receipt),
        receipt.receiptNumber,
      );
    } catch (error) {
      const reason = `Receipt document could not be prepared for WhatsApp: ${error instanceof Error ? error.message : 'unknown error'}`;
      await receiptRepo.updateWhatsappDelivery(receipt.id, {
        status: 'failed',
        failureReason: reason,
      });
      logger.error('WhatsApp receipt document could not be prepared', {
        donationId: receipt.donationId,
        receiptId: receipt.id,
        error: error instanceof Error ? error.message : error,
      });
      return 'failed';
    }
  }

  const result = await withTransientRetries(() =>
    sendWhatsAppReceipt({
      to: recipientPhone,
      customerName: donor.name,
      amountFormatted: formatAmountInr(Number(receipt.donation.amount)),
      receiptNumber: receipt.receiptNumber,
      donationDate: formatDonationDate(donationDate),
      paymentId: receipt.donation.paymentGatewayRef,
      documentUrl,
      filename: receiptFilename(receipt.receiptNumber),
    }),
  );

  await receiptRepo.updateWhatsappDelivery(receipt.id, {
    status: result.status,
    messageId: result.messageId,
    failureReason: storedReason(result),
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
  const recipients = receiptRecipients(receipt.donation);
  if (!recipients.phone) {
    await receiptRepo.markChannelSkipped(receipt.id, 'sms', 'No mobile number is on file');
    return 'skipped';
  }
  if (recipients.phoneBlockedReason) {
    await receiptRepo.markChannelSkipped(receipt.id, 'sms', recipients.phoneBlockedReason);
    return 'skipped';
  }
  const recipientPhone = recipients.phone;
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
    to: maskPhone(recipientPhone),
  });
  const smsResult = await sendSms(recipientPhone, buildReceiptSmsVariables(receipt));
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
    // A receipt says "Paid Successfully": it is only ever issued — and only
    // ever delivered, including by the durable retry — for a donation whose
    // payment is verified and still completed (never pending/failed/refunded).
    const donation = await donationRepo.findById(donationId);
    if (!donation || donation.status !== 'completed') {
      logger.warn('Receipt not issued — donation is not completed', {
        donationId,
        status: donation?.status ?? null,
      });
      if (scheduleRetry)
        await receiptRepo.setNextDeliveryRetry(donationId, null).catch(() => undefined);
      return receiptRepo.findByDonationIdWithDonation(donationId);
    }

    const receipt = await loadReceipt(donationId);
    if (!receipt) {
      logger.error('Receipt row missing after create — skipping delivery', { donationId });
      if (scheduleRetry) await scheduleReceiptDeliveryRetry(donationId);
      return null;
    }

    if (scheduleRetry && !isDryRun()) {
      await receiptRepo.setNextDeliveryRetry(donationId, new Date(Date.now() + IN_FLIGHT_LEASE_MS));
    }

    const pdf = await ensurePdf(receipt);
    if (!pdf || pdf.pdfBuffer.length === 0) {
      logger.error('Receipt PDF generation/upload failed — receipt row still created', {
        donationId,
        receiptId: receipt.id,
      });
      if (scheduleRetry) await scheduleReceiptDeliveryRetry(donationId);
      return receipt;
    }

    const current = (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? pdf.receipt;

    let emailStatus: DeliveryStatus | null = null;
    try {
      emailStatus = await deliverEmail(current, pdf.pdfBuffer, forcePending);
    } catch (error) {
      logger.error('Email delivery threw an error', {
        donationId,
        receiptId: current.id,
        error: error instanceof Error ? error.message : error,
      });
      emailStatus = 'failed';
    }

    const afterEmail = (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? current;
    let orgEmailStatus: DeliveryStatus | null = null;
    try {
      orgEmailStatus = await deliverOrgEmail(afterEmail, pdf.pdfBuffer, forcePending);
    } catch (error) {
      logger.error('Organisation email delivery threw an error', {
        donationId,
        receiptId: afterEmail.id,
        error: error instanceof Error ? error.message : error,
      });
      orgEmailStatus = 'failed';
    }

    const afterOrgEmail =
      (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? afterEmail;
    let whatsappStatus: DeliveryStatus | null = null;
    try {
      whatsappStatus = await deliverWhatsApp(afterOrgEmail, forcePending);
    } catch (error) {
      logger.error('WhatsApp delivery threw an error', {
        donationId,
        receiptId: afterOrgEmail.id,
        error: error instanceof Error ? error.message : error,
      });
      whatsappStatus = 'failed';
    }

    const afterWhatsApp =
      (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? afterOrgEmail;
    let smsStatus: DeliveryStatus | null = null;
    try {
      smsStatus = await deliverSms(afterWhatsApp, forcePending);
    } catch (error) {
      logger.error('SMS delivery threw an error', {
        donationId,
        receiptId: afterWhatsApp.id,
        error: error instanceof Error ? error.message : error,
      });
      smsStatus = 'failed';
    }

    // A channel rejected permanently (Meta 131049, SMTP 550, …) is never
    // retried automatically; only transient failures are.
    const latest = await receiptRepo.findByDonationIdWithDonation(donationId);
    const emailRetryable = autoRetryable(emailStatus, latest?.emailFailureReason);
    const orgEmailRetryable = autoRetryable(orgEmailStatus, latest?.orgEmailFailureReason);
    const whatsappRetryable = autoRetryable(whatsappStatus, latest?.whatsappFailureReason);

    // A dry run records every channel as not sent on purpose — retrying it
    // would only repeat the same no-op.
    if (
      scheduleRetry &&
      !isDryRun() &&
      (emailRetryable ||
        orgEmailRetryable ||
        whatsappRetryable ||
        smsStatus === 'failed' ||
        emailStatus === 'pending' ||
        orgEmailStatus === 'pending' ||
        whatsappStatus === 'pending')
    ) {
      await scheduleReceiptDeliveryRetry(donationId);
    } else if (scheduleRetry) {
      // Nothing left to retry automatically — release the in-flight lease.
      await receiptRepo.setNextDeliveryRetry(donationId, null);
    }

    return receiptRepo.findByDonationIdWithDonation(donationId);
  } catch (error) {
    logger.error('Receipt issuance failed — payment is unaffected', {
      donationId,
      error: error instanceof Error ? error.message : error,
    });
    if (scheduleRetry) await scheduleReceiptDeliveryRetry(donationId);
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
  assertPaymentCompleted(receipt);
  const recipients = receiptRecipients(receipt.donation);
  if (!recipients.phone) {
    throw ApiError.badRequest('No mobile number is on file for this donor.');
  }
  if (recipients.phoneBlockedReason) throw ApiError.conflict(recipients.phoneBlockedReason);
  if (receipt.smsStatus === 'sent') return 'sent';

  const result = await deliverSms(receipt, true);
  if (!result) throw ApiError.badRequest('No mobile number is on file for this donor.');
  return result;
}

export async function retryReceiptEmail(
  donationId: string,
  options: ResendOptions = {},
): Promise<DeliveryStatus> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');
  assertPaymentCompleted(receipt);
  if (!receiptRecipients(receipt.donation).email) {
    throw ApiError.badRequest('No email address is on file for this donor.');
  }
  if (receipt.emailStatus === 'sent') return 'sent';
  if (
    !options.overridePermanent &&
    blockedPermanently(receipt.emailStatus, receipt.emailFailureReason)
  ) {
    throw ApiError.conflict(
      'The mail server rejected this email address, so the receipt will not be resent automatically. It is still available to download.',
    );
  }

  const pdfBuffer = await loadPdfForRetry(receipt);
  const result = await deliverEmail(
    (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? receipt,
    pdfBuffer,
    true,
    options,
  );

  // The organisation copy rides along (as in retryFailedDeliveries): a
  // receipt issued during a dry run otherwise never gets its org email once
  // the donor email is resent. Same PDF and receipt; never an admin override.
  if (receipt.orgEmailStatus !== 'sent') {
    try {
      await deliverOrgEmail(
        (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? receipt,
        pdfBuffer,
        true,
      );
    } catch (error) {
      logger.error('Failed to resend receipt organisation email', {
        donationId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
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

export async function retryReceiptOrgEmail(
  donationId: string,
  options: ResendOptions = {},
): Promise<DeliveryStatus> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');
  assertPaymentCompleted(receipt);
  if (receipt.orgEmailStatus === 'sent') return 'sent';

  const pdfBuffer = await loadPdfForRetry(receipt);
  return deliverOrgEmail(
    (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? receipt,
    pdfBuffer,
    true,
    options,
  );
}

export async function retryReceiptWhatsApp(
  donationId: string,
  options: ResendOptions = {},
): Promise<DeliveryStatus> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');
  assertPaymentCompleted(receipt);
  const recipients = receiptRecipients(receipt.donation);
  if (!recipients.phone) {
    throw ApiError.badRequest('No mobile number is on file for this donor.');
  }
  if (!recipients.whatsappConsent) {
    // Consent is the donor's to give — not even an admin can override it.
    throw ApiError.badRequest('This donor has not opted in to WhatsApp receipts.');
  }
  if (recipients.phoneBlockedReason) throw ApiError.conflict(recipients.phoneBlockedReason);
  if (receipt.whatsappStatus === 'sent') return 'sent';
  if (
    !options.overridePermanent &&
    blockedPermanently(receipt.whatsappStatus, receipt.whatsappFailureReason)
  ) {
    throw ApiError.conflict(
      'WhatsApp declined this message and it will not be resent automatically. The receipt is still available by email and download.',
    );
  }

  if (!receipt.pdfUrl) {
    await ensurePdf(receipt);
  }

  const latest = (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? receipt;
  const result = await deliverWhatsApp(latest, true, options);
  if (!result) throw ApiError.badRequest('No mobile number is on file for this donor.');
  return result;
}

export async function retryFailedDeliveries(
  donationId: string,
  options: ResendOptions = {},
): Promise<{
  emailStatus: DeliveryStatus | null;
  whatsappStatus: DeliveryStatus | null;
}> {
  const receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) throw ApiError.notFound('Receipt not found for this donation.');
  assertPaymentCompleted(receipt);

  let emailStatus: DeliveryStatus | null = receipt.emailStatus;
  let whatsappStatus: DeliveryStatus | null = receipt.whatsappStatus;

  const recipients = receiptRecipients(receipt.donation);
  if (recipients.email && receipt.emailStatus !== 'sent') {
    try {
      emailStatus = await retryReceiptEmail(donationId, options);
    } catch (error) {
      logger.error('Failed to retry receipt email', {
        donationId,
        error: error instanceof Error ? error.message : error,
      });
      emailStatus = 'failed';
    }
  }
  if (
    recipients.phone &&
    recipients.whatsappConsent &&
    !recipients.phoneBlockedReason &&
    receipt.whatsappStatus !== 'sent'
  ) {
    try {
      whatsappStatus = await retryReceiptWhatsApp(donationId, options);
    } catch (error) {
      logger.error('Failed to retry receipt WhatsApp', {
        donationId,
        error: error instanceof Error ? error.message : error,
      });
      whatsappStatus = 'failed';
    }
  }
  // The organisation copy rides along on any retry; its status is internal,
  // so the donor-facing response shape is unchanged. Re-read: the email
  // retry above may already have sent it.
  const afterRetries = (await receiptRepo.findByDonationIdWithDonation(donationId)) ?? receipt;
  if (afterRetries.orgEmailStatus !== 'sent') {
    try {
      await retryReceiptOrgEmail(donationId, options);
    } catch (error) {
      logger.error('Failed to retry receipt organisation email', {
        donationId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  return { emailStatus, whatsappStatus };
}
