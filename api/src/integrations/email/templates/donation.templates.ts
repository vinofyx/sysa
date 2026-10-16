import { emailLayout, button } from './layout';

/** Donor name/category are user-supplied — never interpolate them raw into HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Whole rupees without decimals; any paise always with two places. */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Stored form is `********1234`; shown in the report as `XXXX XXXX 1234`. */
function formatMaskedAadhaar(masked: string | null): string {
  return masked ? `XXXX XXXX ${masked.slice(-4)}` : 'Not provided';
}

/**
 * Organisation copy of a verified donation (ORG_RECEIPT_EMAIL). Identity
 * numbers are only ever the stored masked forms — full PAN/Aadhaar are never
 * retained, so they cannot appear here. Donor-supplied text is escaped.
 */
export function donationReportEmail(params: {
  donorName: string;
  amount: number;
  currency: string;
  categoryName: string;
  receiptNumber: string;
  paymentId: string | null;
  orderId: string | null;
  donationDateTime: string;
  donorEmail: string | null;
  donorPhone: string | null;
  donorAddress: string | null;
  panNumberMasked: string | null;
  aadhaarNumberMasked: string | null;
  /** Authenticated receipt download (lib/receipt-link.ts); null = none. */
  receiptUrl?: string | null;
  businessName?: string;
}) {
  const businessName = params.businessName ?? 'Sai Yadadri Seva Ashram';
  const rows: Array<[string, string]> = [
    ['Donor Name', params.donorName],
    ['Donation Amount', formatCurrency(params.amount, params.currency)],
    ['Receipt Number', params.receiptNumber],
    ['Payment ID', params.paymentId ?? 'Not available'],
    ...(params.orderId ? [['Order ID', params.orderId] as [string, string]] : []),
    ['Donation Date/Time', params.donationDateTime],
    ['Donation Category', params.categoryName],
    ['Donor Email', params.donorEmail ?? 'Not provided'],
    ['Donor Mobile', params.donorPhone || 'Not provided'],
    ...(params.donorAddress ? [['Address', params.donorAddress] as [string, string]] : []),
    ['PAN', params.panNumberMasked ?? 'Not provided'],
    ['Aadhaar', formatMaskedAadhaar(params.aadhaarNumberMasked)],
    ['Payment Status', 'Successful (verified with Razorpay)'],
  ];
  const note =
    'PAN and Aadhaar are shown masked. Full numbers are not stored or sent by this system.';

  return {
    subject: 'Donation Receipt - Sai Yadadri Seva Ashram',
    html: emailLayout({
      title: 'Donation Receipt',
      bodyHtml: `
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          A donation to <strong>${escapeHtml(businessName)}</strong> has been received and verified.
          The donor receipt PDF is attached.
        </p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          ${rows.map(([label, value]) => `${label}: <strong>${escapeHtml(value)}</strong>`).join('<br />')}
        </p>
        ${params.receiptUrl ? button(params.receiptUrl, 'Download Receipt') : ''}
        <p style="font-size:12px; color:#6B7269; line-height:1.6;">${escapeHtml(note)}</p>
      `,
    }),
    text: [
      `A donation to ${businessName} has been received and verified. The donor receipt PDF is attached.`,
      ...rows.map(([label, value]) => `${label}: ${value}`),
      ...(params.receiptUrl ? [`Download receipt: ${params.receiptUrl}`] : []),
      note,
    ].join('\n'),
  };
}

/** Rows whose value is present — a missing optional detail is left out. */
function optionalRows(rows: Array<[string, string | null | undefined]>): Array<[string, string]> {
  return rows.filter(
    (row): row is [string, string] => typeof row[1] === 'string' && row[1].trim() !== '',
  );
}

/** Label/value rows as an email-safe table (inline styles only). */
function detailsTable(rows: Array<[string, string]>): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:14px; margin:8px 0 16px;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0; color:#6B7269; border-bottom:1px solid #E3E1DA; white-space:nowrap; vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0; color:#1A1D1A; border-bottom:1px solid #E3E1DA; font-weight:600; word-break:break-all;">${escapeHtml(value)}</td></tr>`,
    )
    .join('')}</table>`;
}

/**
 * Donor receipt email. Sent only for a completed (verified) donation — see
 * issueReceipt in receipt.service.ts — with the receipt PDF attached by the
 * caller. Donor-supplied values are escaped.
 */
export function donationReceiptEmail(params: {
  donorName: string;
  amount: number;
  currency: string;
  categoryName: string;
  receiptNumber: string;
  receiptUrl: string | null;
  donationDate: string;
  paymentId: string | null;
  /** Razorpay order id when present, otherwise the internal donation id. */
  orderId?: string | null;
  /** Donor details as on the receipt. Mobile and PAN arrive already masked;
   * Aadhaar is never part of the donor email. */
  donorPhoneMasked?: string | null;
  panNumberMasked?: string | null;
  donorAddress?: string | null;
  donorCity?: string | null;
  donorState?: string | null;
  donorPincode?: string | null;
  paymentMethod?: string | null;
  orgName?: string;
  orgPhone?: string | null;
  orgEmail?: string | null;
  orgWebsite?: string;
  businessName?: string;
}) {
  const businessName = params.businessName ?? params.orgName ?? 'Sai Yadadri Seva Ashram';
  const website = params.orgWebsite ?? 'https://sysa.in';
  const formatted = formatCurrency(params.amount, params.currency);
  const contactLine = [params.orgPhone, params.orgEmail, website].filter(Boolean).join(' · ');

  const name = escapeHtml(params.donorName);
  const confirmation =
    `We confirm that your donation of ${formatted} towards ${params.categoryName} has been ` +
    `received successfully by ${businessName}.`;
  const rows: Array<[string, string]> = [
    ['Receipt Number', params.receiptNumber],
    ['Donor Name', params.donorName],
    ...optionalRows([
      ['Mobile Number', params.donorPhoneMasked],
      ['PAN', params.panNumberMasked],
      ['Address', params.donorAddress],
      ['City', params.donorCity],
      ['State', params.donorState],
      ['Pincode', params.donorPincode],
    ]),
    ['Donation Category', params.categoryName],
    ['Amount', formatted],
    ['Donation Date', params.donationDate],
    ['Payment Status', 'Paid Successfully'],
    ...optionalRows([['Payment Method', params.paymentMethod]]),
    ...(params.paymentId ? [['Razorpay Payment ID', params.paymentId] as [string, string]] : []),
    ...(params.orderId
      ? [
          [
            params.orderId.startsWith('order_') ? 'Razorpay Order ID' : 'Donation Reference',
            params.orderId,
          ] as [string, string],
        ]
      : []),
  ];

  return {
    // Exact subject wording requested for donor receipts.
    subject: `Donation Receipt — Sai Yadadri Seva Ashram — Receipt ${params.receiptNumber}`,
    html: emailLayout({
      title: 'Donation Receipt',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Dear ${name},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Thank you for your donation. ${escapeHtml(confirmation)}
          Your official receipt is attached to this email as a PDF.
        </p>
        ${detailsTable(rows)}
        ${params.receiptUrl ? button(params.receiptUrl, 'Download Receipt') : ''}
        <p style="font-size:13px; color:#6B7269; line-height:1.6;">
          With gratitude,<br />
          ${escapeHtml(businessName)}<br />
          ${escapeHtml(contactLine)}
        </p>
      `,
    }),
    text: [
      `Dear ${params.donorName},`,
      '',
      `Thank you for your donation. ${confirmation}`,
      'Your official receipt is attached to this email as a PDF.',
      '',
      ...rows.map(([label, value]) => `${label}: ${value}`),
      '',
      ...(params.receiptUrl ? [`Download your receipt: ${params.receiptUrl}`, ''] : []),
      'With gratitude,',
      businessName,
      contactLine,
    ].join('\n'),
  };
}
