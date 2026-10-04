import PDFDocument from 'pdfkit';
import type { Decimal } from '@prisma/client/runtime/library';

import { LOGO_PNG_BASE64 } from '@/assets/logo-base64';
import { generateUpiQrBuffer } from '@utils/upi-qr';

interface ReceiptPdfInput {
  receiptNumber: string;
  issuedAt: Date;
  donorName: string;
  donorPhone: string;
  donorEmail: string | null;
  donorAddress: string | null;
  donorCity: string | null;
  donorPincode: string | null;
  donorState: string | null;
  panNumberMasked: string | null;
  aadhaarNumberMasked: string | null;
  categoryName: string;
  amount: Decimal;
  currency: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  razorpayOrderId: string | null;
  donationDate: Date;
  orgAddress: string | null;
  orgPhone: string | null;
  orgEmail: string | null;
  orgWebsite?: string | null;
  upiId: string | null;
  /** Set only for a charge created from a `subscription.charged` webhook
   * (subscription.service.ts / webhook.service.ts). */
  monthlyContribution: {
    contributionPeriod: string;
    razorpaySubscriptionId: string;
  } | null;
}

/** Prints "INR 1,000.00" rather than the ₹ glyph — pdfkit's built-in
 * Helvetica only supports WinAnsiEncoding, which has no Rupee sign, and
 * renders it as a garbled character without embedding a full Unicode font. */
function formatCurrency(amount: Decimal, currency: string): string {
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(
    Number(amount),
  );
  return `${currency} ${formatted}`;
}

const INK = '#1A1D1A';
const MUTED = '#6B7269';
const BRAND = '#1B6B3F';
const GOLD = '#C89B3C';
const RULE = '#E3E1DA';

/**
 * Renders a donation receipt as a PDF buffer. Deliberately does not print an
 * 80G/12A tax-exemption number — that certification is unverified in this
 * environment (documentation/16-Assumptions-and-Dependencies.md), matching
 * the same honesty pattern already used for the public `TrustBadge`
 * `tax-exempt` variant (components/public/trust-badge.tsx).
 */
export async function generateReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  const logoBuffer = Buffer.from(LOGO_PNG_BASE64, 'base64');
  const qrBuffer = input.upiId
    ? await generateUpiQrBuffer(input.upiId, 'Sai Yadadri Seva Ashram')
    : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;

    // ---- Header: logo + org identity + receipt number badge ----
    // Every element below is placed at an explicit (x, y) rather than
    // chained off `doc.y`, since pdfkit's cursor-advance behavior after
    // `image()`/`text()` isn't something to rely on for a fixed layout —
    // `doc.y` is reset to a known value once the whole header block is drawn.
    const headerTop = doc.y;
    doc.image(logoBuffer, leftX, headerTop, { width: 52 });

    doc
      .fillColor(BRAND)
      .fontSize(16)
      .text('Sai Yadadri Seva Ashram', leftX + 64, headerTop, { width: pageWidth - 200 })
      .fillColor(MUTED)
      .fontSize(8.5)
      .text('Regd. No. 423/2019 · Hyderabad, Telangana', leftX + 64, headerTop + 22, {
        width: pageWidth - 200,
      });
    if (input.orgAddress) {
      doc.text(input.orgAddress, leftX + 64, headerTop + 34, { width: pageWidth - 200 });
    }

    doc
      .fillColor(GOLD)
      .fontSize(9)
      .text('DONATION RECEIPT', leftX, headerTop, { width: pageWidth, align: 'right' })
      .fillColor(INK)
      .fontSize(11)
      .text(input.receiptNumber, leftX, headerTop + 14, { width: pageWidth, align: 'right' });

    doc.y = headerTop + 72;
    doc
      .moveTo(leftX, doc.y)
      .lineTo(leftX + pageWidth, doc.y)
      .strokeColor(RULE)
      .lineWidth(1)
      .stroke();
    doc.y += 16;

    // ---- Greeting ----
    doc
      .fillColor(INK)
      .fontSize(11)
      .text(`Dear Sri ${input.donorName} Garu,`, leftX, doc.y, { width: pageWidth })
      .moveDown(0.4)
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        `Thank you very much for your generous contribution towards "${input.categoryName}" of ` +
          `${formatCurrency(input.amount, input.currency)} to Sai Yadadri Seva Ashram.`,
        leftX,
        doc.y,
        { width: pageWidth },
      );
    doc.y += 10;

    const row = (label: string, value: string) => {
      doc
        .fontSize(10)
        .fillColor(MUTED)
        .text(label, { continued: true, width: 170 })
        .fillColor(INK)
        .text(value);
    };

    const sectionHeading = (label: string) => {
      doc.moveDown(0.9).fillColor(BRAND).fontSize(10.5).text(label.toUpperCase()).moveDown(0.35);
    };

    // ---- Donor Information ----
    sectionHeading('Donor Information');
    row('Name:', input.donorName);
    row('Mobile Number:', input.donorPhone);
    if (input.donorEmail) row('Email:', input.donorEmail);
    if (input.donorAddress) row('Address:', input.donorAddress);
    const cityStatePin = [input.donorCity, input.donorState, input.donorPincode]
      .filter(Boolean)
      .join(', ');
    if (cityStatePin) row('City/State/Pincode:', cityStatePin);

    // ---- Identity Information (only what was actually supplied) ----
    if (input.panNumberMasked || input.aadhaarNumberMasked) {
      sectionHeading('Identity Information');
      if (input.panNumberMasked) row('PAN:', input.panNumberMasked);
      if (input.aadhaarNumberMasked) row('Aadhaar:', input.aadhaarNumberMasked);
    }

    // ---- Donation Information ----
    sectionHeading('Donation Information');
    row('Item / Service:', input.categoryName);
    row('Donation Category:', input.categoryName);
    row('Donation Amount:', formatCurrency(input.amount, input.currency));
    row('Donation Date:', input.donationDate.toLocaleDateString('en-IN'));
    row('Donation Time:', input.donationDate.toLocaleTimeString('en-IN'));
    row('Payment Status:', 'Paid Successfully');
    if (input.paymentMethod) row('Payment Method:', input.paymentMethod.replace(/_/g, ' '));
    if (input.paymentReference) row('Razorpay Payment ID:', input.paymentReference);
    if (input.razorpayOrderId) row('Razorpay Order ID:', input.razorpayOrderId);
    row('Transaction / Receipt No.:', input.receiptNumber);

    // Charitable donations are not a taxable supply — GST is not charged to
    // the donor. The line is still printed so the receipt is complete when a
    // payer (or auditor) looks for tax details.
    sectionHeading('Payment Summary');
    row('Amount Paid:', formatCurrency(input.amount, input.currency));
    row('GST / Tax:', 'Not applicable');
    row('Total Amount:', formatCurrency(input.amount, input.currency));

    // ---- Monthly Contribution (only for a subscription-linked charge) ----
    if (input.monthlyContribution) {
      sectionHeading('Monthly Contribution');
      row('Contribution Period:', input.monthlyContribution.contributionPeriod);
      row('Subscription ID:', input.monthlyContribution.razorpaySubscriptionId);
    }

    // ---- UPI Information ----
    if (input.upiId) {
      sectionHeading('Give Again via UPI');
      const upiTextY = doc.y;
      doc
        .fontSize(10)
        .fillColor(MUTED)
        .text('UPI ID:', leftX, upiTextY, { continued: true, width: 170 })
        .fillColor(INK)
        .text(input.upiId);
      if (qrBuffer) {
        doc.image(qrBuffer, leftX + pageWidth - 90, upiTextY - 4, { width: 78 });
        doc.y = Math.max(doc.y, upiTextY - 4 + 78 + 8);
      } else {
        doc.moveDown(0.5);
      }
    }

    // ---- Footer ----
    const footerY = doc.page.height - doc.page.margins.bottom - 60;
    doc
      .moveTo(leftX, footerY)
      .lineTo(leftX + pageWidth, footerY)
      .strokeColor(RULE)
      .stroke();
    doc
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        'Your contribution is deeply appreciated and supports the seva activities of Sai Yadadri Seva Ashramam.',
        leftX,
        footerY + 10,
        { width: pageWidth, align: 'center' },
      );
    const contactLine = [input.orgPhone, input.orgEmail, input.orgWebsite ?? 'https://sysa.in']
      .filter(Boolean)
      .join('  ·  ');
    if (contactLine) {
      doc.text(contactLine, leftX, doc.y + 2, { width: pageWidth, align: 'center' });
    }

    doc.end();
  });
}
