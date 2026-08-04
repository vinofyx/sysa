import { prisma } from '@lib/prisma';

export function findByDonationId(donationId: string) {
  return prisma.receipt.findUnique({ where: { donationId } });
}

/** Includes everything the PDF generator needs to render a receipt in one
 * round trip — see services/receipt.service.ts. */
export function findByIdWithDonation(id: string) {
  return prisma.receipt.findUnique({
    where: { id },
    include: {
      donation: { include: { donor: true, category: true } },
    },
  });
}

export function findByDonationIdWithDonation(donationId: string) {
  return prisma.receipt.findUnique({
    where: { donationId },
    include: {
      donation: { include: { donor: true, category: true } },
    },
  });
}

export function updatePdfUrl(id: string, pdfUrl: string) {
  return prisma.receipt.update({ where: { id }, data: { pdfUrl } });
}

/** Sequential, auditable receipt numbers — "RCPT-2026-000123" — per
 * documentation/08-Database-Requirements.md §3.4 ("stores generated receipt
 * number, sequential, auditable"). */
export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.receipt.count({
    where: { receiptNumber: { startsWith: `RCPT-${year}-` } },
  });
  const sequence = String(count + 1).padStart(6, '0');
  return `RCPT-${year}-${sequence}`;
}

export async function createForDonation(donationId: string, pdfUrl?: string) {
  const receiptNumber = await generateReceiptNumber();
  return prisma.receipt.create({
    data: { donationId, receiptNumber, pdfUrl },
  });
}
