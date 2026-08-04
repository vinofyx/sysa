import PDFDocument from 'pdfkit';
import type { Decimal } from '@prisma/client/runtime/library';

interface ReceiptPdfInput {
  receiptNumber: string;
  issuedAt: Date;
  donorName: string;
  donorEmail: string;
  panNumberMasked: string | null;
  categoryName: string;
  amount: Decimal;
  currency: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  donationDate: Date;
}

function formatCurrency(amount: Decimal, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/**
 * Renders a donation receipt as a PDF buffer. Deliberately does not print an
 * 80G/12A tax-exemption number — that certification is unverified in this
 * environment (documentation/16-Assumptions-and-Dependencies.md), matching
 * the same honesty pattern already used for the public `TrustBadge`
 * `tax-exempt` variant (components/public/trust-badge.tsx).
 */
export function generateReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fillColor('#1B6B3F')
      .fontSize(18)
      .text('Sai Yadadri Seva Ashram', { align: 'left' })
      .fillColor('#6B7269')
      .fontSize(9)
      .text('Regd. No. 423/2019 · Hyderabad, Telangana')
      .moveDown(1.5);

    doc
      .fillColor('#1A1D1A')
      .fontSize(14)
      .text('Donation Receipt', { align: 'left' })
      .moveDown(0.75);

    const row = (label: string, value: string) => {
      doc
        .fontSize(10)
        .fillColor('#6B7269')
        .text(label, { continued: true, width: 160 })
        .fillColor('#1A1D1A')
        .text(value);
    };

    row('Receipt Number:', input.receiptNumber);
    row('Date Issued:', input.issuedAt.toLocaleDateString('en-IN'));
    row('Donation Date:', input.donationDate.toLocaleDateString('en-IN'));
    doc.moveDown(0.75);

    row('Donor Name:', input.donorName);
    row('Donor Email:', input.donorEmail);
    if (input.panNumberMasked) row('PAN:', input.panNumberMasked);
    doc.moveDown(0.75);

    row('Category:', input.categoryName);
    row('Amount:', formatCurrency(input.amount, input.currency));
    if (input.paymentMethod) row('Payment Method:', input.paymentMethod.replace('_', ' '));
    if (input.paymentReference) row('Payment Reference:', input.paymentReference);

    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor('#6B7269')
      .text('This receipt is issued for your record-keeping. Thank you for supporting our work.', {
        align: 'left',
      });

    doc.end();
  });
}
