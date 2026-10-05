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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
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
  businessName?: string;
}) {
  const businessName = params.businessName ?? 'Sai Yadadri Seva Ashramam';
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
    subject: 'Donation Receipt - Sai Yadadri Seva Ashramam',
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
        <p style="font-size:12px; color:#6B7269; line-height:1.6;">${escapeHtml(note)}</p>
      `,
    }),
    text: [
      `A donation to ${businessName} has been received and verified. The donor receipt PDF is attached.`,
      ...rows.map(([label, value]) => `${label}: ${value}`),
      note,
    ].join('\n'),
  };
}

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
  const rows: Array<[string, string]> = [
    ['Customer Name', params.donorName],
    ['Receipt Number', params.receiptNumber],
    ...(params.paymentId ? [['Payment ID', params.paymentId] as [string, string]] : []),
    ...(params.orderId ? [['Order/Donation ID', params.orderId] as [string, string]] : []),
    ['Amount', formatted],
    ['Payment Date', params.donationDate],
    ['Service/Order', params.categoryName],
    ['Payment Status', 'Successful'],
  ];

  return {
    subject: `Payment Receipt - ${params.receiptNumber}`,
    html: emailLayout({
      title: 'Payment Receipt',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hello ${name},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Thank you for your payment. Your payment has been successfully received
          by <strong>${escapeHtml(businessName)}</strong>. Please find your payment receipt attached.
        </p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          ${rows.map(([label, value]) => `${label}: <strong>${escapeHtml(value)}</strong>`).join('<br />')}
        </p>
        <p style="font-size:13px; color:#6B7269; line-height:1.6;">
          ${escapeHtml(businessName)}<br />
          ${escapeHtml(contactLine)}
        </p>
        ${params.receiptUrl ? button(params.receiptUrl, 'Download Receipt') : '<p style="font-size:13px; color:#6B7269;">Your receipt PDF is attached to this email.</p>'}
      `,
    }),
    text: [
      `Hello ${params.donorName},`,
      `Thank you for your payment. Your payment has been successfully received by ${businessName}.`,
      ...rows.map(([label, value]) => `${label}: ${value}`),
      `${businessName} · ${contactLine}`,
      params.receiptUrl
        ? `Download your receipt: ${params.receiptUrl}`
        : 'Your receipt PDF is attached to this email.',
    ].join('\n'),
  };
}
