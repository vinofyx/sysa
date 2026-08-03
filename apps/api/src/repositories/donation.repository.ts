import { Prisma } from '@prisma/client';

import { prisma } from '@lib/prisma';

export interface DonationFilters {
  skip?: number;
  take?: number;
  status?: string;
  categoryId?: string;
  source?: string;
  frequency?: string;
  donorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  sortBy?: 'createdAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

function buildWhere(params: DonationFilters): Prisma.DonationWhereInput {
  return {
    ...(params.status
      ? { status: params.status as Prisma.EnumDonationStatusFilter['equals'] }
      : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.source
      ? { source: params.source as Prisma.EnumDonationSourceFilter['equals'] }
      : {}),
    ...(params.frequency
      ? { frequency: params.frequency as Prisma.EnumDonationFrequencyFilter['equals'] }
      : {}),
    ...(params.donorId ? { donorId: params.donorId } : {}),
    ...(params.dateFrom || params.dateTo
      ? {
          createdAt: {
            ...(params.dateFrom ? { gte: params.dateFrom } : {}),
            ...(params.dateTo ? { lte: params.dateTo } : {}),
          },
        }
      : {}),
    ...(params.search
      ? {
          donor: {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  };
}

const include = {
  donor: true,
  category: true,
  appeal: true,
  receipt: true,
} satisfies Prisma.DonationInclude;

export function findMany(params: DonationFilters) {
  const where = buildWhere(params);
  return Promise.all([
    prisma.donation.findMany({
      where,
      include,
      orderBy: { [params.sortBy ?? 'createdAt']: params.sortOrder ?? 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.donation.count({ where }),
  ]);
}

/** Same filters, no pagination — used by the CSV export and analytics endpoints. */
export function findAllForExport(params: Omit<DonationFilters, 'skip' | 'take'>) {
  const where = buildWhere(params);
  return prisma.donation.findMany({ where, include, orderBy: { createdAt: 'desc' } });
}

export function findById(id: string) {
  return prisma.donation.findUnique({ where: { id }, include });
}

export function create(data: Prisma.DonationCreateInput) {
  return prisma.donation.create({ data, include });
}

export function updateStatus(
  id: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  internalNote?: string,
) {
  return prisma.donation.update({
    where: { id },
    data: {
      status,
      completedAt: status === 'completed' ? new Date() : undefined,
      ...(internalNote !== undefined ? { internalNote } : {}),
    },
    include,
  });
}

export interface DonationAnalytics {
  totalCount: number;
  totalAmount: number;
  byCategory: { categoryId: string; nameEn: string; total: number; count: number }[];
  byStatus: { status: string; count: number }[];
  byMonth: { month: string; total: number }[];
}

/** Powers the admin Donation Analytics dashboard — all aggregation done in SQL
 * (via Prisma's groupBy/raw) rather than pulling every row into Node. */
export async function getAnalytics(dateFrom?: Date, dateTo?: Date): Promise<DonationAnalytics> {
  const dateFilter: Prisma.DonationWhereInput =
    dateFrom || dateTo
      ? {
          createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) },
        }
      : {};
  const completedFilter: Prisma.DonationWhereInput = { ...dateFilter, status: 'completed' };

  const [totals, byCategoryRaw, byStatusRaw, byMonthRaw] = await Promise.all([
    prisma.donation.aggregate({
      where: completedFilter,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.donation.groupBy({
      by: ['categoryId'],
      where: completedFilter,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.donation.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: true,
    }),
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT to_char(date_trunc('month', "created_at"), 'YYYY-MM') AS month,
             COALESCE(SUM("amount"), 0)::float AS total
      FROM "donation"
      WHERE "status" = 'completed'
        ${dateFrom ? Prisma.sql`AND "created_at" >= ${dateFrom}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND "created_at" <= ${dateTo}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);

  const categories = await prisma.donationCategory.findMany({
    where: { id: { in: byCategoryRaw.map((c) => c.categoryId) } },
  });
  const categoryNameById = new Map(categories.map((c) => [c.id, c.nameEn]));

  return {
    totalCount: totals._count,
    totalAmount: Number(totals._sum.amount ?? 0),
    byCategory: byCategoryRaw.map((c) => ({
      categoryId: c.categoryId,
      nameEn: categoryNameById.get(c.categoryId) ?? 'Unknown',
      total: Number(c._sum.amount ?? 0),
      count: c._count,
    })),
    byStatus: byStatusRaw.map((s) => ({ status: s.status, count: s._count })),
    byMonth: byMonthRaw.map((m) => ({ month: m.month, total: Number(m.total) })),
  };
}
