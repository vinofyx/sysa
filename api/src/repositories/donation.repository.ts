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
  settlementStatus?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
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
          OR: [
            { donor: { name: { contains: params.search } } },
            { donor: { email: { contains: params.search } } },
            { paymentGatewayRef: { contains: params.search } },
            { razorpayOrderId: { contains: params.search } },
          ],
        }
      : {}),
    ...(params.settlementStatus
      ? {
          settlementStatus:
            params.settlementStatus as Prisma.EnumSettlementStatusNullableFilter['equals'],
        }
      : {}),
    ...(params.paymentMethod
      ? {
          paymentMethod: params.paymentMethod as Prisma.EnumPaymentMethodNullableFilter['equals'],
        }
      : {}),
    ...(params.minAmount != null || params.maxAmount != null
      ? {
          amount: {
            ...(params.minAmount != null ? { gte: params.minAmount } : {}),
            ...(params.maxAmount != null ? { lte: params.maxAmount } : {}),
          },
        }
      : {}),
    ...(params.razorpayPaymentId
      ? { paymentGatewayRef: { contains: params.razorpayPaymentId } }
      : {}),
    ...(params.razorpayOrderId ? { razorpayOrderId: { contains: params.razorpayOrderId } } : {}),
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

export function findByRazorpayOrderId(razorpayOrderId: string) {
  return prisma.donation.findUnique({ where: { razorpayOrderId }, include });
}

export function findByIdempotencyKey(idempotencyKey: string) {
  return prisma.donation.findUnique({ where: { idempotencyKey }, include });
}

export function findByPaymentGatewayRef(paymentGatewayRef: string) {
  return prisma.donation.findUnique({ where: { paymentGatewayRef } });
}

export function create(data: Prisma.DonationCreateInput) {
  return prisma.donation.create({ data, include });
}

/** Marks a pending online donation as completed once Razorpay confirms
 * capture — used by both the synchronous verify endpoint and the webhook
 * handler (whichever arrives first "wins"; the second is a no-op via the
 * `status === 'completed'` guard in payment-verification.service.ts).
 * `razorpayFee`/`razorpayTax`/`netAmount` are optional purely-informational
 * extras (payment_details_page) — captured from the same Razorpay payment
 * object the caller already fetched to verify `status === 'captured'`, no
 * extra API call. Omitting them is always safe; nothing here affects the
 * completion/receipt logic above. */
export function markCompletedFromPayment(
  id: string,
  data: {
    paymentMethod: string;
    paymentGatewayRef: string;
    razorpaySignature?: string;
    razorpayPaymentStatus?: string;
    razorpayFee?: number | null;
    razorpayTax?: number | null;
    netAmount?: number | null;
  },
) {
  return prisma.donation.update({
    where: { id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      paymentMethod:
        data.paymentMethod as Prisma.NullableEnumPaymentMethodFieldUpdateOperationsInput['set'],
      paymentGatewayRef: data.paymentGatewayRef,
      razorpaySignature: data.razorpaySignature,
      razorpayPaymentStatus: data.razorpayPaymentStatus,
      razorpayFee: data.razorpayFee,
      razorpayTax: data.razorpayTax,
      netAmount: data.netAmount,
      paymentSyncedAt: new Date(),
    },
    include,
  });
}

/** Written only by razorpay-settlement.service.ts (admin "Refresh Payment
 * Status" action and the `settlement.processed` webhook) — never invents
 * values, only persists exactly what Razorpay's own APIs returned. */
export function updatePaymentSyncData(
  id: string,
  data: {
    razorpayPaymentStatus: string;
    razorpayFee: number | null;
    razorpayTax: number | null;
    netAmount: number | null;
    refundAmount: number | null;
    settlementStatus: Prisma.NullableEnumSettlementStatusFieldUpdateOperationsInput['set'];
    razorpaySettlementId: string | null;
    razorpaySettlementUtr: string | null;
    settledAt: Date | null;
  },
) {
  return prisma.donation.update({
    where: { id },
    data: { ...data, paymentSyncedAt: new Date() },
    include,
  });
}

export function markFailed(id: string, failureReason: string) {
  return prisma.donation.update({
    where: { id },
    data: { status: 'failed', failureReason },
    include,
  });
}

/** Used by "Retry Payment" — reopens a failed attempt against the same
 * Razorpay order (which stays payable until captured) rather than creating a
 * new donation row. */
export function resetToPending(id: string) {
  return prisma.donation.update({
    where: { id },
    data: { status: 'pending', failureReason: null },
    include,
  });
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
    // MySQL has no `date_trunc`/`to_char`/`::float` cast — `DATE_FORMAT`
    // alone produces the same "YYYY-MM" grouping key in one step, and
    // MySQL's SUM() over a DECIMAL column already returns a numeric value
    // Prisma types correctly without an explicit cast.
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
             COALESCE(SUM(amount), 0) AS total
      FROM donation
      WHERE status = 'completed'
        ${dateFrom ? Prisma.sql`AND created_at >= ${dateFrom}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND created_at <= ${dateTo}` : Prisma.empty}
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

/** Candidates for a `settlement.processed` webhook-triggered bulk sync
 * (razorpay-settlement.service.ts) — captured payments that aren't already
 * confirmed `settled`, bounded to a recent window so this can never grow
 * into an unbounded scan as the organization's donation history grows. */
export function findUnsettledCandidates(sinceDays: number) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  return prisma.donation.findMany({
    where: {
      source: 'online',
      status: 'completed',
      paymentGatewayRef: { not: null },
      completedAt: { gte: since },
      OR: [
        { settlementStatus: null },
        { settlementStatus: { in: ['not_settled', 'pending', 'unknown'] } },
      ],
    },
    select: { id: true },
  });
}

export interface PaymentSummary {
  totalDonations: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedAmount: number;
  totalSettledAmount: number;
  pendingSettlementAmount: number;
}

/** Powers the admin donation-payments dashboard's summary cards
 * (dashboard_summary) — every figure is a real aggregate over the same
 * `Donation` rows the table below shows, computed in SQL, never hardcoded.
 * Online donations only (source='online'): a manual/cash/cheque entry has no
 * Razorpay payment or settlement to track. */
export async function getPaymentSummary(): Promise<PaymentSummary> {
  const onlineFilter: Prisma.DonationWhereInput = { source: 'online' };

  const [totalDonations, byStatus, refundedAgg, settledAgg, pendingSettlementAgg] =
    await Promise.all([
      prisma.donation.count({ where: onlineFilter }),
      prisma.donation.groupBy({ by: ['status'], where: onlineFilter, _count: true }),
      prisma.donation.aggregate({
        where: { ...onlineFilter, refundAmount: { gt: 0 } },
        _sum: { refundAmount: true },
      }),
      prisma.donation.aggregate({
        where: { ...onlineFilter, settlementStatus: 'settled' },
        _sum: { netAmount: true },
      }),
      prisma.donation.aggregate({
        where: {
          ...onlineFilter,
          status: 'completed',
          settlementStatus: { in: ['not_settled', 'pending', 'unknown'] },
        },
        _sum: { amount: true },
      }),
    ]);

  const countByStatus = new Map(byStatus.map((s) => [s.status, s._count]));

  return {
    totalDonations,
    successfulPayments: countByStatus.get('completed') ?? 0,
    pendingPayments: countByStatus.get('pending') ?? 0,
    failedPayments: countByStatus.get('failed') ?? 0,
    refundedAmount: Number(refundedAgg._sum.refundAmount ?? 0),
    totalSettledAmount: Number(settledAgg._sum.netAmount ?? 0),
    pendingSettlementAmount: Number(pendingSettlementAgg._sum.amount ?? 0),
  };
}
