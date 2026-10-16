import PDFDocument from 'pdfkit';
import type { Decimal } from '@prisma/client/runtime/library';

import { LOGO_PNG_BASE64 } from '@/assets/logo-base64';
import { maskPhone } from '@utils/pii-mask';
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
  /** Accepted for completeness; never printed (see Donor Information). */
  aadhaarNumberMasked?: string | null;
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
  const value = Number(amount);
  // Whole rupees print without decimals; anything with paise always shows
  // two places ("1,000.50", never "1,000.5").
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${formatted}`;
}

const INK = '#1A1D1A';
const MUTED = '#6B7269';
const BRAND = '#1B6B3F';
const GOLD = '#C89B3C';
const RULE = '#E3E1DA';

/** Receipts are Indian donations: dates are always shown in IST, never in the
 * server's own timezone (a UTC host would otherwise print the wrong day for
 * any donation made between 00:00 and 05:30 IST). */
const RECEIPT_TIME_ZONE = 'Asia/Kolkata';

export function formatReceiptDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    timeZone: RECEIPT_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatReceiptTime(date: Date): string {
  return `${date.toLocaleTimeString('en-IN', {
    timeZone: RECEIPT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })} IST`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
  bank_transfer_manual: 'Bank Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
};

export function formatPaymentMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, ' ');
}

const LABEL_WIDTH = 150;
const ROW_GAP = 2.5;
const FOOTER_HEIGHT = 60;
export const ORG_NAME = 'Sai Yadadri Seva Ashram';

/**
 * Renders a donation receipt as a PDF buffer. Deliberately does not print an
 * 80G/12A tax-exemption number — that certification is unverified in this
 * environment (documentation/16-Assumptions-and-Dependencies.md), matching
 * the same honesty pattern already used for the public `TrustBadge`
 * `tax-exempt` variant (components/public/trust-badge.tsx).
 */
export async function generateReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  const logoBuffer = Buffer.from(LOGO_PNG_BASE64, 'base64');
  const qrBuffer = input.upiId ? await generateUpiQrBuffer(input.upiId, ORG_NAME) : null;

  return new Promise((resolve, reject) => {
    // bufferPages: the footer is drawn on every page once the body is laid out.
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;
    const bodyBottom = () => doc.page.height - doc.page.margins.bottom - FOOTER_HEIGHT - 10;

    /** Starts a new page when `height` more points would run into the footer. */
    const ensureSpace = (height: number) => {
      if (doc.y + height > bodyBottom()) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }
    };

    // ---- Header: logo + org identity (left), receipt badge (right) ----
    // Every element is placed at an explicit (x, y); the header's height is
    // measured from what was actually drawn, so a long organisation address
    // can never run into the rule below it.
    const headerTop = doc.y;
    const identityX = leftX + 64;
    const identityWidth = pageWidth - 64 - 150;
    doc.image(logoBuffer, leftX, headerTop, { width: 52 });

    doc.fillColor(BRAND).fontSize(16).text(ORG_NAME, identityX, headerTop, {
      width: identityWidth,
    });
    doc
      .fillColor(MUTED)
      .fontSize(8.5)
      .text('Regd. No. 423/2019 · Hyderabad, Telangana', identityX, doc.y + 2, {
        width: identityWidth,
      });
    if (input.orgAddress) {
      doc.text(input.orgAddress, identityX, doc.y + 1, { width: identityWidth });
    }
    const identityBottom = doc.y;

    const badgeX = leftX + pageWidth - 150;
    doc
      .fillColor(GOLD)
      .fontSize(9)
      .text('DONATION RECEIPT', badgeX, headerTop, { width: 150, align: 'right' })
      .fillColor(INK)
      .fontSize(11)
      .text(input.receiptNumber, badgeX, headerTop + 14, { width: 150, align: 'right' })
      .fillColor(MUTED)
      .fontSize(8.5)
      .text(`Issued ${formatReceiptDate(input.issuedAt)}`, badgeX, headerTop + 30, {
        width: 150,
        align: 'right',
      });

    doc.y = Math.max(identityBottom, headerTop + 56, doc.y) + 12;
    doc
      .moveTo(leftX, doc.y)
      .lineTo(leftX + pageWidth, doc.y)
      .strokeColor(RULE)
      .lineWidth(1)
      .stroke();
    doc.y += 16;

    // ---- Greeting and thank-you ----
    doc
      .fillColor(INK)
      .fontSize(11)
      .text(`Dear Sri ${input.donorName} Garu,`, leftX, doc.y, { width: pageWidth })
      .moveDown(0.4)
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        `Thank you very much for your generous contribution towards "${input.categoryName}" of ` +
          `${formatCurrency(input.amount, input.currency)} to ${ORG_NAME}. ` +
          'This receipt confirms that your payment has been received.',
        leftX,
        doc.y,
        { width: pageWidth },
      );
    doc.y += 6;

    /** Width kept free on the right of the rows (the UPI QR block). */
    let reservedRight = 0;

    /** Label/value in fixed columns; long values wrap inside their own column. */
    const row = (label: string, value: string) => {
      doc.fontSize(10);
      const valueWidth = pageWidth - LABEL_WIDTH - reservedRight;
      const height = Math.max(
        doc.heightOfString(label, { width: LABEL_WIDTH - 8 }),
        doc.heightOfString(value, { width: valueWidth }),
      );
      ensureSpace(height + ROW_GAP);
      const y = doc.y;
      doc.fillColor(MUTED).text(label, leftX, y, { width: LABEL_WIDTH - 8 });
      doc.fillColor(INK).text(value, leftX + LABEL_WIDTH, y, { width: valueWidth });
      doc.y = y + height + ROW_GAP;
    };

    /** `keepWith`: space the section's first content needs, so a heading is
     * never left alone at the bottom of a page. */
    const sectionHeading = (label: string, keepWith = 20) => {
      ensureSpace(30 + keepWith);
      doc.y += 8;
      doc
        .fillColor(BRAND)
        .fontSize(10.5)
        .text(label.toUpperCase(), leftX, doc.y, { width: pageWidth });
      doc.y += 4;
    };

    // ---- Donor Information (only what is on file — nothing is invented) ----
    sectionHeading('Donor Information');
    row('Name', input.donorName);
    // Masked, as on the website: the PDF is downloadable by link and forwarded.
    if (input.donorPhone) row('Mobile Number', maskPhone(input.donorPhone));
    if (input.donorEmail) row('Email', input.donorEmail);
    if (input.donorAddress) row('Address', input.donorAddress);
    if (input.donorCity) row('City', input.donorCity);
    if (input.donorState) row('State', input.donorState);
    if (input.donorPincode) row('Pincode', input.donorPincode);
    // PAN (stored masked) identifies the donor for tax purposes. Aadhaar is
    // deliberately not printed: there is no verified legal requirement for
    // it on a donation receipt, and the PDF is shared by email and link.
    if (input.panNumberMasked) row('PAN', input.panNumberMasked);

    // ---- Donation Information ----
    sectionHeading('Donation Information');
    row('Receipt Number', input.receiptNumber);
    row('Donation Category', input.categoryName);
    row('Donation Amount', formatCurrency(input.amount, input.currency));
    row('Donation Date', formatReceiptDate(input.donationDate));
    row('Donation Time', formatReceiptTime(input.donationDate));
    // Receipts are only ever issued for a completed (verified) donation —
    // see issueReceipt's status guard in receipt.service.ts.
    row('Payment Status', 'Paid Successfully');
    if (input.paymentMethod) row('Payment Method', formatPaymentMethod(input.paymentMethod));
    if (input.paymentReference) row('Razorpay Payment ID', input.paymentReference);
    if (input.razorpayOrderId) row('Razorpay Order ID', input.razorpayOrderId);

    // Charitable donations are not a taxable supply — GST is not charged to
    // the donor. The line is still printed so the receipt is complete when a
    // payer (or auditor) looks for tax details.
    // The "give again" UPI QR sits beside the summary rather than in its own
    // section, so a full receipt still fits on one A4 page.
    const qrSize = 78;
    sectionHeading('Payment Summary', input.upiId ? qrSize + 10 : 20);
    const summaryTop = doc.y;
    let upiBlockBottom = summaryTop;
    if (input.upiId) {
      const blockWidth = 150;
      const blockX = leftX + pageWidth - blockWidth;
      reservedRight = blockWidth + 10;
      doc
        .fillColor(MUTED)
        .fontSize(8.5)
        .text('Give again via UPI', blockX, summaryTop - 14, {
          width: blockWidth,
          align: 'center',
        });
      if (qrBuffer) {
        doc.image(qrBuffer, blockX + (blockWidth - qrSize) / 2, summaryTop, { width: qrSize });
      }
      doc
        .fillColor(INK)
        .fontSize(8.5)
        .text(input.upiId, blockX, summaryTop + (qrBuffer ? qrSize + 2 : 0), {
          width: blockWidth,
          align: 'center',
        });
      upiBlockBottom = doc.y;
      doc.y = summaryTop;
    }
    row('Amount Paid', formatCurrency(input.amount, input.currency));
    row('GST / Tax', 'Not applicable');
    row('Total Amount', formatCurrency(input.amount, input.currency));

    // ---- Monthly Contribution (only for a subscription-linked charge) ----
    if (input.monthlyContribution) {
      sectionHeading('Monthly Contribution');
      row('Contribution Period', input.monthlyContribution.contributionPeriod);
      row('Subscription ID', input.monthlyContribution.razorpaySubscriptionId);
    }
    reservedRight = 0;
    doc.y = Math.max(doc.y, upiBlockBottom);

    // ---- Footer on every page ----
    const contactLine = [input.orgPhone, input.orgEmail, input.orgWebsite ?? 'https://sysa.in']
      .filter(Boolean)
      .join('  ·  ');
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const footerY = doc.page.height - doc.page.margins.bottom - FOOTER_HEIGHT;
      doc
        .moveTo(leftX, footerY)
        .lineTo(leftX + pageWidth, footerY)
        .strokeColor(RULE)
        .lineWidth(1)
        .stroke();
      doc
        .fontSize(9)
        .fillColor(MUTED)
        .text(
          `Your contribution is deeply appreciated and supports the seva activities of ${ORG_NAME}.`,
          leftX,
          footerY + 10,
          { width: pageWidth, align: 'center' },
        );
      doc.text(contactLine, leftX, footerY + 34, { width: pageWidth, align: 'center' });
      if (range.count > 1) {
        doc.text(`Page ${i - range.start + 1} of ${range.count}`, leftX, footerY + 46, {
          width: pageWidth,
          align: 'center',
        });
      }
    }

    doc.end();
  });
}
