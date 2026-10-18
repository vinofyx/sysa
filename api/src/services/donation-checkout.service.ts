import { env, notificationsMode } from '@config/env';
import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { signDonationAccessToken } from '@lib/donor-jwt';
import { ApiError } from '@utils/api-error';
import { maskEmail, maskPhone } from '@utils/pii-mask';
import { normalizeIndianMobile } from '@utils/mobile';

import * as donationRepo from '@repositories/donation.repository';
import * as donationCategoryRepo from '@repositories/donation-category.repository';
import * as appealRepo from '@repositories/appeal.repository';
import { createOrder } from '@services/razorpay-order.service';
import { resolveDonor } from '@services/donor-resolution.service';
import { heldByDryRun } from '@services/receipt.service';
import { receiptRecipients } from '@services/receipt-recipients';
import { ORG_NAME } from '@services/receipt-pdf.service';

export interface InitiateDonationInput {
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  panNumber: string;
  aadhaarNumber: string;
  donorAddress?: string;
  donorCity?: string;
  donorPincode?: string;
  donorState?: string;
  /** Explicit WhatsApp receipt opt-in for this donation (default false). */
  whatsappReceiptConsent?: boolean;
  categoryId: string;
  /** Stable category code; used only when `categoryId` is unknown. */
  categoryCode?: string;
  appealId?: string;
  amount: number;
  idempotencyKey: string;
}

export interface CheckoutSession {
  donationId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  statusToken: string;
}

function toCheckoutSession(
  donationId: string,
  razorpayOrderId: string,
  amount: number,
): CheckoutSession {
  return {
    donationId,
    razorpayOrderId,
    amount,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID ?? '',
    statusToken: signDonationAccessToken(donationId),
  };
}

/**
 * `POST /donations/initiate` — creates the Razorpay order first (so a
 * gateway failure never leaves an orphan pending donation row behind), then
 * the `Donation` row itself. Safe to retry client-side on network failure:
 * a repeated call with the same `idempotencyKey` returns the existing
 * session instead of creating a duplicate (documentation/13-API-Requirements.md §7).
 */
export async function initiateDonation(input: InitiateDonationInput): Promise<CheckoutSession> {
  const existing = await donationRepo.findByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    if (!existing.razorpayOrderId) {
      throw ApiError.conflict('This donation attempt is no longer valid. Please start again.');
    }
    return toCheckoutSession(existing.id, existing.razorpayOrderId, Number(existing.amount));
  }

  // Validate referenced entities exist BEFORE touching the Razorpay API —
  // otherwise a bogus but well-formed categoryId/appealId creates a real,
  // orphaned Razorpay order and only then fails on the DB insert.
  const { category, matchedBy } = await donationCategoryRepo.findForCheckout(
    input.categoryId,
    input.categoryCode,
  );
  if (!category) throw ApiError.badRequest('Selected donation category was not found.');
  if (matchedBy === 'code') {
    logger.warn('Checkout category id is stale — resolved by category code', {
      categoryCode: category.code,
    });
  }
  if (input.appealId) {
    const appeal = await appealRepo.findById(input.appealId);
    if (!appeal) throw ApiError.badRequest('Selected appeal was not found.');
  }

  const donor = await resolveDonor(input);

  const amountPaise = Math.round(input.amount * 100);
  const order = await createOrder({
    amountPaise,
    currency: 'INR',
    receipt: input.idempotencyKey,
    notes: { idempotencyKey: input.idempotencyKey, categoryId: category.id },
  });

  const donation = await donationRepo.create({
    donor: { connect: { id: donor.id } },
    category: { connect: { id: category.id } },
    ...(input.appealId ? { appeal: { connect: { id: input.appealId } } } : {}),
    amount: input.amount,
    currency: 'INR',
    source: 'online',
    status: 'pending',
    razorpayOrderId: order.id,
    idempotencyKey: input.idempotencyKey,
    // Receipts go to what was submitted with this donation, whichever donor
    // record it was matched to (see receipt.service.ts receiptRecipients).
    receiptEmail: input.donorEmail ?? null,
    receiptPhone: normalizeIndianMobile(input.donorPhone),
    whatsappReceiptConsent: input.whatsappReceiptConsent === true,
  });

  await writeAuditLog({
    action: 'PAYMENT_INITIATED',
    entityType: 'donation',
    entityId: donation.id,
    afterState: { amount: input.amount, categoryId: category.id, razorpayOrderId: order.id },
  });

  return toCheckoutSession(donation.id, order.id, input.amount);
}

export async function getDonationStatus(donationId: string) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw ApiError.notFound('Donation not found');

  const receipt = donation.receipt;
  // Same recipients the receipt is delivered to (receipt-recipients.ts).
  const recipients = receiptRecipients(donation);
  return {
    id: donation.id,
    status: donation.status,
    paymentStatus: donation.status,
    amount: Number(donation.amount),
    currency: donation.currency,
    category: donation.category.nameEn,
    failureReason: donation.failureReason,
    // Website receipt view — the same donor details the PDF prints, with
    // contact details masked because this response is reachable by link.
    organisationName: ORG_NAME,
    donorName: donation.donor.name,
    donorEmailMasked: recipients.email ? maskEmail(recipients.email) : null,
    donorPhoneMasked: recipients.phone ? maskPhone(recipients.phone) : null,
    donorAddress: donation.donor.address || null,
    donorCity: donation.donor.city || null,
    donorState: donation.donor.state || null,
    donorPincode: donation.donor.pincode || null,
    // Only the stored masked PAN ever leaves the API; Aadhaar is not returned.
    panNumberMasked: donation.donor.panNumberMasked || null,
    donationDate: donation.completedAt ?? donation.createdAt,
    paymentMethod: donation.paymentMethod,
    receiptAvailable: !!receipt?.pdfUrl || !!receipt?.receiptNumber,
    receiptGenerated: !!receipt?.receiptGeneratedAt || !!receipt?.receiptNumber,
    receiptNumber: receipt?.receiptNumber ?? null,
    receiptUrl: receipt?.pdfUrl ?? null,
    razorpayPaymentId: donation.paymentGatewayRef,
    razorpayOrderId: donation.razorpayOrderId,
    smsStatus: receipt?.smsStatus ?? null,
    emailStatus: receipt?.emailStatus ?? null,
    emailSentAt: receipt?.emailSentAt ?? null,
    emailFailureReason: receipt?.emailFailureReason ?? null,
    emailOnFile: !!recipients.email,
    whatsappStatus: receipt?.whatsappStatus ?? null,
    whatsappSentAt: receipt?.whatsappSentAt ?? null,
    whatsappFailureReason: receipt?.whatsappFailureReason ?? null,
    mobileOnFile: !!recipients.phone,
    whatsappConsent: recipients.whatsappConsent,
    // Provider delivery report (null until MSG91 reports one). `whatsappStatus`
    // 'sent' alone only means MSG91 accepted the request.
    whatsappDeliveryStatus: receipt?.whatsappDeliveryStatus ?? null,
    // True while NOTIFICATIONS_MODE is dry_run: channels read not_configured
    // on purpose, so the success page must not present them as failures.
    notificationsDryRun: notificationsMode() === 'dry_run',
    // Per channel: held back by a dry run that has since ended (mode is now
    // live). Still unsent — resendable — but never a delivery failure.
    emailHeldByDryRun: heldByDryRun(receipt?.emailStatus, receipt?.emailFailureReason),
    whatsappHeldByDryRun: heldByDryRun(receipt?.whatsappStatus, receipt?.whatsappFailureReason),
    createdAt: receipt?.issuedAt ?? donation.createdAt,
    updatedAt: receipt?.updatedAt ?? donation.completedAt ?? donation.createdAt,
    paymentReference: donation.paymentGatewayRef,
  };
}

/** Same payload as `getDonationStatus`, used by GET /donations/:id/receipt
 * so website and mobile never assemble receipt fields themselves. */
export async function getDonationReceiptView(donationId: string) {
  const view = await getDonationStatus(donationId);
  if (!view.receiptNumber) throw ApiError.notFound('Receipt is not available yet.');
  return {
    ...view,
    pdfUrl: view.receiptUrl,
  };
}

/** Reopens a `pending`/`failed` donation for another payment attempt against
 * the SAME Razorpay order — Razorpay orders stay payable across multiple
 * attempts until one is captured, so this never creates a duplicate donation
 * row (satisfies "Prevent Duplicate Payments"). */
export async function retryDonation(donationId: string): Promise<CheckoutSession> {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw ApiError.notFound('Donation not found');
  if (donation.status === 'completed') {
    throw ApiError.conflict('This donation has already been completed.');
  }
  if (!donation.razorpayOrderId) {
    throw ApiError.badRequest('This donation cannot be retried.');
  }

  if (donation.status === 'failed') {
    await donationRepo.resetToPending(donation.id);
  }

  return toCheckoutSession(donation.id, donation.razorpayOrderId, Number(donation.amount));
}
