/**
 * Test harness for the payment → receipt → delivery pipeline. Must be the
 * first import of a test file: it configures env before `@config/env` parses
 * it, and installs an in-memory Prisma stand-in on `global.__prisma` (which
 * `@lib/prisma` reuses outside production) before any repository loads.
 *
 * Only the network edges are stubbed by the tests themselves (Razorpay SDK,
 * SMTP transport, global fetch) — every service/repository runs for real.
 */
import '../setup-env';

import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'mysql://ci:ci@localhost:3306/ci';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-must-be-32-chars-min';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-must-be-32-chars-min';
process.env.RAZORPAY_KEY_ID = 'rzp_test_harness';
process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_key_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_razorpay_webhook_secret';
process.env.LOG_LEVEL = 'error';
process.env.SMTP_HOST = 'smtp.test.invalid';
process.env.SMTP_PORT = '587';
process.env.SMTP_USERNAME = 'receipts@test.invalid';
process.env.SMTP_PASSWORD = 'smtp-password-SECRET';
process.env.SMTP_FROM_EMAIL = 'receipts@test.invalid';
process.env.MSG91_AUTHKEY = 'msg91-authkey-SECRET-value';
process.env.MSG91_WHATSAPP_NUMBER = '+91 9490118877';
process.env.MSG91_WABA_ID = '1511221500759195';
process.env.MSG91_WHATSAPP_TEMPLATE_NAME = 'sysa_donation_receipt';
process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE = 'test_namespace';
process.env.MSG91_WHATSAPP_TEMPLATE_ID = '567627';
process.env.MSG91_WHATSAPP_TEMPLATE_APPROVED = 'true';
// Exercise the built-in sysa_donation_receipt mapping, not a pinned override.
delete process.env.MSG91_WHATSAPP_TEMPLATE_VARS;
process.env.SMS_DLT_CONTENT_VERIFIED = 'true';
process.env.SMS_SENDER_ID = 'SYSAOF';
process.env.SMS_DLT_TEMPLATE_ID = 'test-msg91-flow-template-id';
delete process.env.CLOUDINARY_CLOUD_NAME;

type Row = Record<string, unknown>;

export const db = {
  donations: new Map<string, Row>(),
  donors: new Map<string, Row>(),
  categories: new Map<string, Row>(),
  receipts: new Map<string, Row>(),
  webhookEvents: new Map<string, Row>(),
};

export function resetDb(): void {
  for (const table of Object.values(db)) table.clear();
}

function uniqueViolation(target: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${target}`, {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

/** Minimal Prisma `where` evaluator — equality, `null`, `{ in }`, `{ not }`,
 * `{ startsWith }` and `OR`, which is all the receipt/donation repos use. */
/** Dates compare by instant (Prisma semantics), everything else by value. */
function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

function comparable(v: unknown): number | string | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number' || typeof v === 'string') return v;
  return null;
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some((c) => matches(row, c));
    // Donation → receipt relation filter: `receipt: { is: null }`.
    if (key === 'receipt' && cond && typeof cond === 'object' && 'is' in (cond as Row)) {
      const hasReceipt = [...db.receipts.values()].some((r) => r.donationId === row.id);
      return (cond as Row).is === null ? !hasReceipt : hasReceipt;
    }
    const value = row[key] ?? null;
    if (cond === null) return value === null;
    if (typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as Row;
      if ('in' in c) return (c.in as unknown[]).includes(value);
      if ('not' in c) return !same(value, c.not);
      if ('startsWith' in c)
        return typeof value === 'string' && value.startsWith(c.startsWith as string);
      const v = comparable(value);
      if (v === null) return false;
      if ('lte' in c && !((v as number) <= (comparable(c.lte) as number))) return false;
      if ('lt' in c && !((v as number) < (comparable(c.lt) as number))) return false;
      if ('gte' in c && !((v as number) >= (comparable(c.gte) as number))) return false;
      return true;
    }
    return same(value, cond);
  });
}

function findOne(table: Map<string, Row>, where: Row): Row | undefined {
  return [...table.values()].find((row) => matches(row, where));
}

function stripUndefined(data: Row): Row {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

/** Applies `data` to `row`, supporting Prisma's `{ increment: n }`. */
function applyData(row: Row, data: Row): Row {
  const next: Row = { ...row };
  for (const [key, value] of Object.entries(stripUndefined(data))) {
    if (value && typeof value === 'object' && !(value instanceof Date) && 'increment' in value) {
      next[key] = Number(row[key] ?? 0) + Number((value as Row).increment);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function donationWithRelations(row: Row, include?: Row): Row {
  const out: Row = { ...row };
  if (!include) return out;
  if (include.donor) out.donor = { ...(db.donors.get(row.donorId as string) as Row) };
  if (include.category) out.category = { ...(db.categories.get(row.categoryId as string) as Row) };
  if (include.appeal) out.appeal = null;
  if (include.subscription) out.subscription = null;
  if (include.receipt) {
    const receipt = findOne(db.receipts, { donationId: row.id });
    out.receipt = receipt ? { ...receipt } : null;
  }
  return out;
}

function receiptWithRelations(row: Row, include?: Row): Row {
  const out: Row = { ...row };
  const donationInclude = (include?.donation as { include?: Row } | undefined)?.include;
  if (include?.donation) {
    const donation = db.donations.get(row.donationId as string);
    out.donation = donation ? donationWithRelations(donation, donationInclude) : null;
  }
  return out;
}

export const fakePrisma = {
  $on: () => undefined,
  auditLog: { create: async () => ({}) },
  siteSettings: { findUnique: async () => null },
  appeal: { update: async () => ({}) },
  donor: {
    findFirst: async ({ where }: { where: Row }) => {
      const row = findOne(db.donors, where);
      return row ? { ...row } : null;
    },
    findUnique: async ({ where }: { where: Row }) => {
      const row = findOne(db.donors, where);
      return row ? { ...row } : null;
    },
    create: async ({ data }: { data: Row }) => {
      if (data.email && findOne(db.donors, { email: data.email })) throw uniqueViolation('email');
      const row: Row = {
        id: randomUUID(),
        email: null,
        address: null,
        city: null,
        pincode: null,
        state: null,
        panNumberMasked: null,
        aadhaarNumberMasked: null,
        whatsappReceiptConsent: false,
        whatsappConsentUpdatedAt: null,
        ...stripUndefined(data),
      };
      db.donors.set(row.id as string, row);
      return { ...row };
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = findOne(db.donors, where);
      if (!row) throw new Error('Record to update not found');
      const next = { ...row, ...stripUndefined(data) };
      db.donors.set(row.id as string, next);
      return { ...next };
    },
  },
  paymentWebhookEvent: {
    findUnique: async ({ where }: { where: Row }) => findOne(db.webhookEvents, where) ?? null,
    create: async ({ data }: { data: Row }) => {
      if (findOne(db.webhookEvents, { eventId: data.eventId })) throw uniqueViolation('event_id');
      const row = { id: randomUUID(), ...data };
      db.webhookEvents.set(row.id as string, row);
      return row;
    },
  },
  donationCategory: {
    findUnique: async ({ where }: { where: Row }) => {
      const row = findOne(db.categories, where);
      return row ? { isActive: true, ...row } : null;
    },
  },
  donation: {
    /** What `/donations/initiate` writes (donor/category arrive as connects). */
    create: async ({ data, include }: { data: Row; include?: Row }) => {
      const {
        donor,
        category,
        appeal: _appeal,
        ...fields
      } = data as Row & {
        donor: { connect: { id: string } };
        category: { connect: { id: string } };
      };
      const row: Row = {
        id: randomUUID(),
        donorId: donor.connect.id,
        categoryId: category.connect.id,
        appealId: null,
        subscriptionId: null,
        paymentMethod: null,
        paymentGatewayRef: null,
        failureReason: null,
        completedAt: null,
        createdAt: new Date(),
        receiptEmail: null,
        receiptPhone: null,
        whatsappReceiptConsent: null,
        ...stripUndefined(fields),
        amount: new Prisma.Decimal(fields.amount as number),
      };
      db.donations.set(row.id as string, row);
      return donationWithRelations(row, include);
    },
    findMany: async ({ where, take }: { where: Row; take?: number }) =>
      [...db.donations.values()]
        .filter((row) => matches(row, where))
        .slice(0, take)
        .map((row) => ({ id: row.id })),
    findUnique: async ({ where, include }: { where: Row; include?: Row }) => {
      const row = findOne(db.donations, where);
      return row ? donationWithRelations(row, include) : null;
    },
    update: async ({ where, data, include }: { where: Row; data: Row; include?: Row }) => {
      const row = findOne(db.donations, where);
      if (!row) throw new Error('Record to update not found');
      const next = { ...row, ...stripUndefined(data) };
      if (
        next.paymentGatewayRef &&
        findOne(db.donations, { paymentGatewayRef: next.paymentGatewayRef, id: { not: row.id } })
      ) {
        throw uniqueViolation('payment_gateway_ref');
      }
      db.donations.set(row.id as string, next);
      return donationWithRelations(next, include);
    },
  },
  receipt: {
    findMany: async ({
      where,
      orderBy,
      take,
    }: {
      where: Row;
      orderBy?: Record<string, 'asc' | 'desc'>;
      take?: number;
    }) => {
      const rows = [...db.receipts.values()].filter((row) => matches(row, where));
      const [field, dir] = Object.entries(orderBy ?? {})[0] ?? [];
      if (field) {
        rows.sort(
          (a, b) =>
            ((comparable(a[field]) as number) - (comparable(b[field]) as number)) *
            (dir === 'desc' ? -1 : 1),
        );
      }
      return rows.slice(0, take ?? rows.length).map((row) => ({ ...row }));
    },
    findUnique: async ({ where, include }: { where: Row; include?: Row }) => {
      const row = findOne(db.receipts, where);
      return row ? receiptWithRelations(row, include) : null;
    },
    findFirst: async ({
      where,
      orderBy,
    }: {
      where: Row;
      orderBy?: Record<string, 'asc' | 'desc'>;
    }) => {
      const rows = [...db.receipts.values()].filter((row) => matches(row, where));
      const [field, dir] = Object.entries(orderBy ?? {})[0] ?? [];
      if (field) {
        rows.sort(
          (a, b) => String(a[field]).localeCompare(String(b[field])) * (dir === 'desc' ? -1 : 1),
        );
      }
      return rows[0] ? { ...rows[0] } : null;
    },
    create: async ({ data }: { data: Row }) => {
      if (!db.donations.has(data.donationId as string)) throw new Error('FK: donation missing');
      if (findOne(db.receipts, { donationId: data.donationId }))
        throw uniqueViolation('donation_id');
      if (findOne(db.receipts, { receiptNumber: data.receiptNumber })) {
        throw uniqueViolation('receipt_number');
      }
      const row: Row = {
        id: randomUUID(),
        pdfUrl: null,
        issuedAt: new Date(),
        receiptGeneratedAt: null,
        smsStatus: null,
        emailStatus: null,
        emailSentAt: null,
        emailMessageId: null,
        emailFailureReason: null,
        whatsappStatus: null,
        whatsappSentAt: null,
        whatsappMessageId: null,
        whatsappFailureReason: null,
        updatedAt: new Date(),
        deliveryRetryCount: 0,
        nextDeliveryRetryAt: null,
        whatsappDeliveryStatus: null,
        ...stripUndefined(data),
      };
      db.receipts.set(row.id as string, row);
      return { ...row };
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = findOne(db.receipts, where);
      if (!row) throw new Error('Record to update not found');
      const next = { ...applyData(row, data), updatedAt: new Date() };
      db.receipts.set(row.id as string, next);
      return { ...next };
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      let count = 0;
      for (const row of db.receipts.values()) {
        if (!matches(row, where)) continue;
        db.receipts.set(row.id as string, { ...applyData(row, data), updatedAt: new Date() });
        count += 1;
      }
      return { count };
    },
  },
};

(globalThis as { __prisma?: unknown }).__prisma = fakePrisma;

export interface SeedOptions {
  email?: string | null;
  phone?: string | null;
  amount?: number;
  /** Defaults to true: most flow tests exercise WhatsApp delivery. */
  whatsappReceiptConsent?: boolean;
}

/** Seeds a pending online donation exactly as `createCheckout` leaves it. */
export function seedPendingDonation(options: SeedOptions = {}): {
  donationId: string;
  orderId: string;
} {
  const donorId = randomUUID();
  const categoryId = randomUUID();
  const donationId = randomUUID();
  const orderId = `order_${donationId.slice(0, 8)}`;

  db.donors.set(donorId, {
    id: donorId,
    name: 'Ravi Kumar',
    email: options.email === undefined ? 'ravi.kumar@example.com' : options.email,
    phone: options.phone === undefined ? '9876543210' : options.phone,
    address: null,
    city: null,
    pincode: null,
    state: null,
    panNumberMasked: null,
    aadhaarNumberMasked: null,
    whatsappReceiptConsent: options.whatsappReceiptConsent ?? true,
    whatsappConsentUpdatedAt: null,
  });
  db.categories.set(categoryId, { id: categoryId, nameEn: 'Annadanam' });
  db.donations.set(donationId, {
    id: donationId,
    donorId,
    categoryId,
    appealId: null,
    subscriptionId: null,
    amount: new Prisma.Decimal(options.amount ?? 2500),
    currency: 'INR',
    status: 'pending',
    paymentMethod: null,
    paymentGatewayRef: null,
    razorpayOrderId: orderId,
    failureReason: null,
    createdAt: new Date('2026-09-30T05:00:00Z'),
    completedAt: null,
  });
  return { donationId, orderId };
}

/** What Razorpay's `payments.fetch` returns for a payment made against one of
 * the seeded donations' orders: the real order id, amount (paise) and
 * currency, so the server-side order/amount/currency check sees a genuine
 * match. Resolves the donation from the `pay_X` ↔ `order_X` naming used by
 * `seedPendingDonation`, falling back to the only pending donation. */
export function fakeRazorpayPayment(
  paymentId: string,
  status: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const donations = [...db.donations.values()];
  const orderId = paymentId.replace(/^pay_/, 'order_');
  const pending = donations.filter((d) => d.status === 'pending');
  const donation =
    donations.find((d) => d.razorpayOrderId === orderId) ??
    donations.find((d) => d.paymentGatewayRef === paymentId) ??
    (pending.length === 1 ? pending[0] : undefined);
  return {
    id: paymentId,
    status,
    method: 'upi',
    fee: 5000,
    tax: 900,
    order_id: donation?.razorpayOrderId ?? null,
    amount: donation ? Math.round(Number(donation.amount) * 100) : 0,
    currency: (donation?.currency as string | undefined) ?? 'INR',
    ...overrides,
  };
}
