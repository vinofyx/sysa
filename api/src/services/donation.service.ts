import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { toCsv } from '@utils/csv-export';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as donationRepo from '@repositories/donation.repository';
import * as donorRepo from '@repositories/donor.repository';
import * as appealRepo from '@repositories/appeal.repository';
import type { DonationFilters } from '@repositories/donation.repository';
import { issueReceipt } from '@services/receipt.service';
import { syncDonationPaymentStatus } from '@services/razorpay-settlement.service';

export interface CreateManualDonationInput {
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  categoryId: string;
  appealId?: string;
  amount: number;
  paymentMethod:
    'upi' | 'card' | 'netbanking' | 'wallet' | 'bank_transfer_manual' | 'cash' | 'cheque';
  frequency: 'one_time' | 'monthly';
  internalNote?: string;
}

export async function listDonations(
  filters: Omit<DonationFilters, 'skip' | 'take'>,
  page: number,
  pageSize: number,
) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await donationRepo.findMany({ ...filters, skip, take });
  return paginate(rows, total, { page, pageSize });
}

export async function getDonation(id: string) {
  const donation = await donationRepo.findById(id);
  if (!donation) throw ApiError.notFound('Donation not found');
  return donation;
}

/**
 * Records an offline (cash/cheque/bank-transfer) donation — see UC-05 in
 * documentation/06-Use-Cases.md. Always created as `completed` (money has
 * already been received by the time a Finance Admin logs it) and immediately
 * gets a receipt, matching the online-payment "completed → receipt" invariant
 * enforced throughout design/12-Database-ERD.md §4.
 */
export async function createManualDonation(
  input: CreateManualDonationInput,
  createdByAdminId: string,
) {
  const donor = await donorRepo.findOrCreate({
    name: input.donorName,
    email: input.donorEmail,
    phone: input.donorPhone,
  });

  const donation = await donationRepo.create({
    donor: { connect: { id: donor.id } },
    category: { connect: { id: input.categoryId } },
    ...(input.appealId ? { appeal: { connect: { id: input.appealId } } } : {}),
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    frequency: input.frequency,
    source: 'manual',
    status: 'completed',
    completedAt: new Date(),
    internalNote: input.internalNote,
  });

  try {
    await issueReceipt(donation.id);
  } catch (error) {
    logger.error('Receipt issuance failed for manual donation', {
      donationId: donation.id,
      error: error instanceof Error ? error.message : error,
    });
  }

  if (input.appealId) {
    await appealRepo.recalculateRaisedAmount(input.appealId);
  }

  await writeAuditLog({
    adminUserId: createdByAdminId,
    action: 'CREATED',
    entityType: 'donation',
    entityId: donation.id,
    afterState: { ...input, donorId: donor.id },
  });

  return donationRepo.findById(donation.id);
}

export async function updateDonationStatus(
  id: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  internalNote: string | undefined,
  updatedByAdminId: string,
) {
  const before = await donationRepo.findById(id);
  if (!before) throw ApiError.notFound('Donation not found');

  const updated = await donationRepo.updateStatus(id, status, internalNote);

  // A completed donation always has a receipt; a status change INTO completed
  // (e.g. a delayed webhook reconciliation) must generate one if missing.
  if (status === 'completed') {
    try {
      await issueReceipt(id);
    } catch (error) {
      logger.error('Receipt issuance failed after status change to completed', {
        donationId: id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  if (before.appealId) {
    await appealRepo.recalculateRaisedAmount(before.appealId);
  }

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: status === 'refunded' ? 'STATUS_CHANGED' : 'UPDATED',
    entityType: 'donation',
    entityId: id,
    beforeState: { status: before.status },
    afterState: { status, internalNote },
  });

  return donationRepo.findById(updated.id);
}

export async function exportDonationsCsv(params: Omit<DonationFilters, 'skip' | 'take'>) {
  const donations = await donationRepo.findAllForExport(params);
  return toCsv(
    donations.map((d) => ({
      id: d.id,
      donorName: d.donor.name,
      donorEmail: d.donor.email,
      category: d.category.nameEn,
      amount: d.amount.toString(),
      currency: d.currency,
      paymentMethod: d.paymentMethod,
      status: d.status,
      source: d.source,
      frequency: d.frequency,
      razorpayOrderId: d.razorpayOrderId ?? '',
      paymentGatewayRef: d.paymentGatewayRef ?? '',
      failureReason: d.failureReason ?? '',
      createdAt: d.createdAt,
      completedAt: d.completedAt,
    })),
    [
      'id',
      'donorName',
      'donorEmail',
      'category',
      'amount',
      'currency',
      'paymentMethod',
      'status',
      'source',
      'frequency',
      'razorpayOrderId',
      'paymentGatewayRef',
      'failureReason',
      'createdAt',
      'completedAt',
    ],
  );
}

export async function getDonationAnalytics(dateFrom?: Date, dateTo?: Date) {
  return donationRepo.getAnalytics(dateFrom, dateTo);
}

export async function getPaymentSummary() {
  return donationRepo.getPaymentSummary();
}

/** Admin "Refresh Payment Status" action (payment_details_page /
 * admin_dashboard.actions) — re-fetches this one donation's payment and
 * settlement status live from Razorpay and persists whatever it returns.
 * Audited like every other admin-triggered donation change. */
export async function refreshDonationPaymentStatus(id: string, requestedByAdminId: string) {
  const updated = await syncDonationPaymentStatus(id);

  await writeAuditLog({
    adminUserId: requestedByAdminId,
    action: 'PAYMENT_STATUS_REFRESHED',
    entityType: 'donation',
    entityId: id,
    afterState: {
      razorpayPaymentStatus: updated.razorpayPaymentStatus,
      settlementStatus: updated.settlementStatus,
    },
  });

  return updated;
}

export { paginate };
