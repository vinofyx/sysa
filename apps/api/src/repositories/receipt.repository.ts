import { prisma } from '@lib/prisma';

export function findByDonationId(donationId: string) {
  return prisma.receipt.findUnique({ where: { donationId } });
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
