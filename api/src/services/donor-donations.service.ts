import { toSkipTake, paginate } from '@utils/pagination';
import { signDonationAccessToken } from '@lib/donor-jwt';

import * as donationRepo from '@repositories/donation.repository';

/**
 * FR-DON-07 — a donor's own donation history. Explicitly re-shapes each row
 * rather than returning the admin `Donation` include as-is: `internalNote`
 * is an admin-only field (Finance/verification notes) that must never leak
 * to the donor it's written about.
 */
export async function listMyDonations(donorId: string, page: number, pageSize: number) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await donationRepo.findMany({
    donorId,
    skip,
    take,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const data = rows.map((donation) => ({
    id: donation.id,
    amount: donation.amount,
    currency: donation.currency,
    status: donation.status,
    paymentMethod: donation.paymentMethod,
    frequency: donation.frequency,
    createdAt: donation.createdAt,
    completedAt: donation.completedAt,
    category: { nameEn: donation.category.nameEn, nameTe: donation.category.nameTe },
    appeal: donation.appeal
      ? { titleEn: donation.appeal.titleEn, titleTe: donation.appeal.titleTe }
      : null,
    receiptAvailable: !!donation.receipt?.pdfUrl,
    // Minted here (not stored) since the donor is already authenticated by
    // the time this row is built — lets every receipt link, whether reached
    // from the post-payment success page or this history list, use the same
    // uniform token-scoped `/donations/:id/receipt` access path.
    receiptToken: donation.receipt?.pdfUrl ? signDonationAccessToken(donation.id) : null,
  }));

  return paginate(data, total, { page, pageSize });
}
