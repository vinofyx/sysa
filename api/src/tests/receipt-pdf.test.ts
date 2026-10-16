import './setup-env';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Decimal } from '@prisma/client/runtime/library';

import { generateReceiptPdf } from '@services/receipt-pdf.service';

import PDFDocument from 'pdfkit';

import {
  countPdfPages,
  extractPdfText,
  extractPdfTextRuns,
  type PdfTextRun,
} from './helpers/pdf-text';

type PdfInput = Parameters<typeof generateReceiptPdf>[0];

function minimalInput(overrides: Partial<PdfInput> = {}): PdfInput {
  return {
    receiptNumber: 'RCPT-2026-000001',
    issuedAt: new Date('2026-09-05T10:00:00Z'),
    donorName: 'Test Donor',
    donorPhone: '9490118877',
    donorEmail: null,
    donorAddress: null,
    donorCity: null,
    donorPincode: null,
    donorState: null,
    panNumberMasked: null,
    aadhaarNumberMasked: null,
    categoryName: 'Annadanam',
    amount: new Decimal(501),
    currency: 'INR',
    paymentMethod: null,
    paymentReference: null,
    razorpayOrderId: null,
    donationDate: new Date('2026-09-05T10:00:00Z'),
    orgAddress: null,
    orgPhone: null,
    orgEmail: null,
    upiId: null,
    monthlyContribution: null,
    ...overrides,
  };
}

function fullInput(): PdfInput {
  return minimalInput({
    receiptNumber: 'RCPT-2026-000099',
    // 19:45 UTC is 01:15 IST the NEXT day — the receipt must show IST.
    issuedAt: new Date('2026-10-15T19:45:00Z'),
    donationDate: new Date('2026-10-15T19:45:00Z'),
    donorName: 'Ravi Kumar',
    donorPhone: '9876543210',
    donorEmail: 'ravi.kumar@example.com',
    donorAddress:
      'Flat 402, Sri Sai Residency, Road No. 12, Banjara Hills, near the old water tank',
    donorCity: 'Hyderabad',
    donorState: 'Telangana',
    donorPincode: '500034',
    panNumberMasked: 'XXXXX1234F',
    aadhaarNumberMasked: '********1234',
    amount: new Decimal('1000.50'),
    paymentMethod: 'upi',
    paymentReference: 'pay_TEST1234567890',
    razorpayOrderId: 'order_TEST1234567890',
    orgAddress: 'Plot 12, Yadadri Road, Bhongir, Yadadri Bhuvanagiri District, Telangana 508116',
    orgPhone: '+91 90000 00000',
    orgEmail: 'info@example.org',
    upiId: 'test@upi',
    monthlyContribution: {
      contributionPeriod: 'October 2026',
      razorpaySubscriptionId: 'sub_TEST123',
    },
  });
}

/** Value printed next to a label (labels and values are separate text runs). */
function valueAfter(lines: string[], label: string): string | undefined {
  const index = lines.indexOf(label);
  return index >= 0 ? lines[index + 1] : undefined;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 50;
const VALUE_COLUMN_X = MARGIN + 150;

const measurer = new PDFDocument({ size: 'A4' }).font('Helvetica');
function widthOf(run: PdfTextRun): number {
  return measurer.fontSize(run.size).widthOfString(run.text);
}

/** Every run fully inside the printable area, and no two runs that share a
 * line overlap horizontally. */
function assertLayoutSound(runs: PdfTextRun[]): void {
  const epsilon = 0.5;
  for (const run of runs) {
    const right = run.x + widthOf(run);
    assert.ok(run.x >= MARGIN - epsilon, `"${run.text}" starts left of the margin (x=${run.x})`);
    assert.ok(
      right <= A4.width - MARGIN + epsilon,
      `"${run.text}" runs past the right margin (${right})`,
    );
    // Top of the glyphs (~ascent) below the top margin; descenders above the bottom one.
    assert.ok(
      run.y + run.size * 0.718 <= A4.height - MARGIN + epsilon,
      `"${run.text}" is clipped at the top`,
    );
    assert.ok(
      run.y - run.size * 0.25 >= MARGIN - epsilon,
      `"${run.text}" is clipped at the bottom`,
    );
  }
  for (let i = 0; i < runs.length; i += 1) {
    for (let j = i + 1; j < runs.length; j += 1) {
      const a = runs[i];
      const b = runs[j];
      if (a.page !== b.page) continue;
      const sameLine = Math.abs(a.y - b.y) < Math.min(a.size, b.size) * 0.8;
      if (!sameLine) continue;
      const overlap = Math.min(a.x + widthOf(a), b.x + widthOf(b)) - Math.max(a.x, b.x);
      assert.ok(overlap <= 0.5, `"${a.text}" overlaps "${b.text}"`);
    }
  }
}

describe('Receipt PDF generation', () => {
  it('renders a PDF buffer with the required receipt fields', async () => {
    const pdf = await generateReceiptPdf(
      minimalInput({
        paymentMethod: 'upi',
        paymentReference: 'pay_test123',
        razorpayOrderId: 'order_test123',
      }),
    );

    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.ok(pdf.length > 1000);
  });

  it('prints every receipt field with the correct value, on one A4 page', async () => {
    const pdf = await generateReceiptPdf(fullInput());
    const lines = extractPdfText(pdf);
    const text = lines.join('\n');

    assert.equal(countPdfPages(pdf), 1);
    assert.match(pdf.toString('latin1'), /\/MediaBox \[0 0 595\.28 841\.89\]/); // A4
    assert.ok(text.includes('Sai Yadadri Seva Ashram'));
    assert.ok(text.includes('DONATION RECEIPT'));
    assert.ok(text.includes('Dear Sri Ravi Kumar Garu,'));
    assert.match(text, /Thank you very much for your generous contribution/);

    assert.equal(valueAfter(lines, 'Receipt Number'), 'RCPT-2026-000099');
    assert.equal(valueAfter(lines, 'Name'), 'Ravi Kumar');
    assert.equal(valueAfter(lines, 'Mobile Number'), '******3210');
    assert.equal(valueAfter(lines, 'Email'), 'ravi.kumar@example.com');
    // Long address wraps within its column; joined back it is complete.
    const address = lines
      .slice(lines.indexOf('Address') + 1, lines.indexOf('City'))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    assert.equal(
      address,
      'Flat 402, Sri Sai Residency, Road No. 12, Banjara Hills, near the old water tank',
    );
    assert.equal(valueAfter(lines, 'City'), 'Hyderabad');
    assert.equal(valueAfter(lines, 'State'), 'Telangana');
    assert.equal(valueAfter(lines, 'Pincode'), '500034');
    assert.equal(valueAfter(lines, 'PAN'), 'XXXXX1234F');
    // Aadhaar is never printed, not even masked.
    assert.ok(!lines.some((line) => /aadhaar/i.test(line)));
    assert.ok(!lines.some((line) => line.includes('********1234')));
    assert.equal(valueAfter(lines, 'Donation Category'), 'Annadanam');
    // Paise always print with two decimals, never "1,000.5".
    assert.equal(valueAfter(lines, 'Donation Amount'), 'INR 1,000.50');
    assert.equal(valueAfter(lines, 'Total Amount'), 'INR 1,000.50');
    // IST, regardless of the server's timezone.
    assert.equal(valueAfter(lines, 'Donation Date'), '16 Oct 2026');
    assert.equal(valueAfter(lines, 'Donation Time'), '01:15 am IST');
    assert.ok(text.includes('Issued 16 Oct 2026'));
    assert.equal(valueAfter(lines, 'Payment Status'), 'Paid Successfully');
    assert.equal(valueAfter(lines, 'Payment Method'), 'UPI');
    assert.equal(valueAfter(lines, 'Razorpay Payment ID'), 'pay_TEST1234567890');
    assert.equal(valueAfter(lines, 'Razorpay Order ID'), 'order_TEST1234567890');
    assert.equal(valueAfter(lines, 'Subscription ID'), 'sub_TEST123');
    assert.ok(text.includes('test@upi'));
    // Category is printed once as a field, not duplicated under another label.
    assert.equal(lines.filter((line) => line === 'Annadanam').length, 1);
  });

  it('leaves out missing optional donor and organisation fields instead of inventing them', async () => {
    const pdf = await generateReceiptPdf(minimalInput());
    const lines = extractPdfText(pdf);
    const text = lines.join('\n');

    assert.equal(countPdfPages(pdf), 1);
    for (const absent of [
      'Email',
      'Address',
      'City',
      'State',
      'Pincode',
      'PAN',
      'Aadhaar',
      'Payment Method',
      'Razorpay Payment ID',
      'Razorpay Order ID',
      'MONTHLY CONTRIBUTION',
      'Give again via UPI',
    ]) {
      assert.ok(!lines.includes(absent), `"${absent}" should not be printed`);
    }
    assert.doesNotMatch(text, /null|undefined|NaN/);
    assert.equal(valueAfter(lines, 'Name'), 'Test Donor');
    assert.equal(valueAfter(lines, 'Donation Amount'), 'INR 501');
    // Footer still carries the website when no org phone/email is configured.
    assert.ok(text.includes('https://sysa.in'));
  });

  it('wraps long values within their column and keeps a heading with its content', async () => {
    const long = 'A'.repeat(20) + ' ' + 'Very long address segment '.repeat(12);
    const pdf = await generateReceiptPdf({ ...fullInput(), donorAddress: long, orgAddress: long });
    const lines = extractPdfText(pdf);
    // Overflow goes to a second page with the footer repeated, never over it.
    const pages = countPdfPages(pdf);
    if (pages > 1) {
      assert.equal(lines.filter((line) => line.startsWith('Page ')).length, pages);
    }
    const headingIndex = lines.indexOf('PAYMENT SUMMARY');
    assert.ok(headingIndex >= 0);
    assert.equal(lines[headingIndex + 1], 'Give again via UPI');
  });

  it('lays out a full receipt with the heading unclipped, columns aligned and nothing overlapping', async () => {
    const pdf = await generateReceiptPdf(fullInput());
    const runs = extractPdfTextRuns(pdf);
    assertLayoutSound(runs);

    const heading = runs.find((run) => run.text === 'DONATION RECEIPT');
    const orgName = runs.find((run) => run.text === 'Sai Yadadri Seva Ashram');
    assert.ok(heading && orgName, 'heading and organisation name are drawn');
    assert.equal(heading.page, 0);
    // Receipt number sits directly under the heading, right-aligned with it.
    const number = runs.find(
      (run) => run.text === 'RCPT-2026-000099' && run.y < heading.y && run.y > heading.y - 30,
    );
    assert.ok(number, 'receipt number is under the heading');

    // Every label's value starts in the same column, on the label's baseline.
    for (const label of [
      'Name',
      'Mobile Number',
      'Email',
      'Receipt Number',
      'Donation Category',
      'Donation Amount',
      'Donation Date',
      'Payment Status',
      'Payment Method',
      'Razorpay Payment ID',
    ]) {
      const labelRun = runs.find((run) => run.text === label && run.x === MARGIN);
      assert.ok(labelRun, `label "${label}" is drawn in the label column`);
      const valueRun = runs.find(
        (run) =>
          run.page === labelRun.page && Math.abs(run.y - labelRun.y) < 0.01 && run.x !== MARGIN,
      );
      assert.ok(valueRun, `label "${label}" has a value on the same line`);
      assert.equal(valueRun.x, VALUE_COLUMN_X, `value for "${label}" is in the value column`);
    }
  });

  it('masks the mobile number', async () => {
    const lines = extractPdfText(await generateReceiptPdf(fullInput()));
    assert.equal(valueAfter(lines, 'Mobile Number'), '******3210');
    assert.ok(!lines.some((line) => line.includes('9876543210')));
  });

  it('wraps very long names, emails, categories and payment references without clipping', async () => {
    const longEmail =
      'venkata.satyanarayana.murthy.subrahmanyam.extremely.long.address@subdomain.example-organisation.co.in';
    const longRef = 'pay_ToBbNB4qkQWFa4ToBbNB4qkQWFa4ToBbNB4qkQWFa4ToBbNB4qkQWFa4ToBb';
    const longName =
      'Venkata Satya Narayana Murthy Subrahmanya Lakshmi Prasanna Kumari Garimella Bhattiprolu';
    const pdf = await generateReceiptPdf({
      ...fullInput(),
      donorName: longName,
      donorEmail: longEmail,
      categoryName:
        'Adopt a Student — Higher Education Support Programme for Rural Girls (Annual Sponsorship)',
      paymentReference: longRef,
      razorpayOrderId: `order_${'X'.repeat(70)}`,
    });
    const runs = extractPdfTextRuns(pdf);
    assertLayoutSound(runs);
    const text = runs.map((run) => run.text).join('');
    // Wrapped across lines, but every character is still on the page.
    assert.ok(text.includes(longEmail), 'full email is printed');
    assert.ok(text.includes(longRef), 'full payment reference is printed');
    assert.ok(text.replace(/s/g, '').includes(longName.replace(/s/g, '')), 'full name is printed');
    // Wrapped value lines stay in the value column.
    const emailRuns = runs.filter((run) => longEmail.includes(run.text) && run.text.length > 5);
    assert.ok(emailRuns.length >= 2, 'long email wraps onto more than one line');
    for (const run of emailRuns) assert.equal(run.x, VALUE_COLUMN_X);
  });

  it('lays out a minimal receipt cleanly', async () => {
    assertLayoutSound(extractPdfTextRuns(await generateReceiptPdf(minimalInput())));
  });
});
