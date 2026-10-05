import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

const include = {
  category: true,
  verifiedByAdmin: true,
  linkedDonation: true,
} satisfies Prisma.BankTransferRecordInclude;

export function findMany(params: { skip?: number; take?: number; status?: string }) {
  const where: Prisma.BankTransferRecordWhereInput = params.status
    ? { status: params.status as Prisma.EnumBankTransferStatusFilter['equals'] }
    : {};
  return Promise.all([
    prisma.bankTransferRecord.findMany({
      where,
      include,
      orderBy: { submittedAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.bankTransferRecord.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.bankTransferRecord.findUnique({ where: { id }, include });
}

export function create(data: Prisma.BankTransferRecordCreateInput) {
  return prisma.bankTransferRecord.create({ data, include });
}

export function markVerified(id: string, verifiedByAdminId: string, linkedDonationId: string) {
  return prisma.bankTransferRecord.update({
    where: { id },
    data: { status: 'verified', verifiedByAdminId, linkedDonationId },
    include,
  });
}

export function markRejected(id: string, verifiedByAdminId: string, internalNote?: string) {
  return prisma.bankTransferRecord.update({
    where: { id },
    data: { status: 'rejected', verifiedByAdminId, internalNote },
    include,
  });
}
