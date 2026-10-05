import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as bankTransferRepo from '@repositories/bank-transfer-record.repository';
import * as donorRepo from '@repositories/donor.repository';
import * as donationRepo from '@repositories/donation.repository';
import { issueReceipt } from '@services/receipt.service';

export interface SubmitClaimInput {
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  categoryId: string;
  amount: number;
  bankReferenceUtr?: string;
}

/** Public — a donor self-reports a bank transfer/UPI payment they already
 * made outside the platform (design/03-User-Flows.md F-03). No `Donation` row
 * exists yet; a Finance Admin verifies against the bank statement first. */
export async function submitClaim(input: SubmitClaimInput) {
  return bankTransferRepo.create({
    donorName: input.donorName,
    donorEmail: input.donorEmail,
    donorPhone: input.donorPhone,
    category: { connect: { id: input.categoryId } },
    amount: input.amount,
    bankReferenceUtr: input.bankReferenceUtr,
  });
}

export async function listClaims(page: number, pageSize: number, status?: string) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await bankTransferRepo.findMany({ skip, take, status });
  return paginate(rows, total, { page, pageSize });
}

export async function getClaim(id: string) {
  const claim = await bankTransferRepo.findById(id);
  if (!claim) throw ApiError.notFound('Bank transfer record not found');
  return claim;
}

/**
 * Verifying a claim creates the authoritative `Donation` record (status
 * completed, source manual, paymentMethod bank_transfer_manual/upi) and links
 * it back to this claim — see UC-05 in documentation/06-Use-Cases.md.
 */
export async function verifyClaim(
  id: string,
  paymentMethod: 'upi' | 'bank_transfer_manual',
  verifiedByAdminId: string,
) {
  const claim = await getClaim(id);
  if (claim.status !== 'pending_verification') {
    throw ApiError.conflict(`This claim has already been ${claim.status}.`);
  }

  const donor = await donorRepo.findOrCreate({
    name: claim.donorName,
    email: claim.donorEmail ?? `${claim.id}@unverified.sysaindia.org`,
    phone: claim.donorPhone ?? undefined,
  });

  const donation = await donationRepo.create({
    donor: { connect: { id: donor.id } },
    category: { connect: { id: claim.categoryId } },
    amount: claim.amount,
    paymentMethod,
    source: 'manual',
    status: 'completed',
    completedAt: new Date(),
    internalNote: `Verified bank transfer claim ${claim.id}${claim.bankReferenceUtr ? ` (UTR: ${claim.bankReferenceUtr})` : ''}`,
  });

  try {
    await issueReceipt(donation.id);
  } catch (error) {
    logger.error('Receipt issuance failed for verified bank transfer', {
      donationId: donation.id,
      error: error instanceof Error ? error.message : error,
    });
  }
  await bankTransferRepo.markVerified(id, verifiedByAdminId, donation.id);

  await writeAuditLog({
    adminUserId: verifiedByAdminId,
    action: 'VERIFIED',
    entityType: 'bank_transfer_record',
    entityId: id,
    afterState: { linkedDonationId: donation.id },
  });

  return getClaim(id);
}

export async function rejectClaim(id: string, internalNote: string, rejectedByAdminId: string) {
  const claim = await getClaim(id);
  if (claim.status !== 'pending_verification') {
    throw ApiError.conflict(`This claim has already been ${claim.status}.`);
  }

  const updated = await bankTransferRepo.markRejected(id, rejectedByAdminId, internalNote);

  await writeAuditLog({
    adminUserId: rejectedByAdminId,
    action: 'REJECTED',
    entityType: 'bank_transfer_record',
    entityId: id,
    afterState: { internalNote },
  });

  return updated;
}
