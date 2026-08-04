import { emailLayout, button } from './layout';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function donationReceiptEmail(params: {
  donorName: string;
  amount: number;
  currency: string;
  categoryName: string;
  receiptNumber: string;
  receiptUrl: string | null;
}) {
  const formatted = formatCurrency(params.amount, params.currency);
  return {
    subject: `Thank you for your donation — Sai Yadadri Seva Ashram`,
    html: emailLayout({
      title: 'Thank you for your donation',
      bodyHtml: `
        <p style="font-size:16px; color:#1A1D1A;">Hi ${params.donorName},</p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Thank you for your generous donation of <strong>${formatted}</strong> towards
          <strong>${params.categoryName}</strong>. Your support makes a real difference.
        </p>
        <p style="font-size:14px; color:#1A1D1A; line-height:1.6;">
          Receipt Number: <strong>${params.receiptNumber}</strong>
        </p>
        ${params.receiptUrl ? button(params.receiptUrl, 'Download Receipt') : '<p style="font-size:13px; color:#6B7269;">Your receipt is being prepared and will be available shortly on the donation confirmation page.</p>'}
      `,
    }),
    text: `Hi ${params.donorName}, thank you for your donation of ${formatted} towards ${params.categoryName}. Receipt Number: ${params.receiptNumber}.${params.receiptUrl ? ` Download your receipt: ${params.receiptUrl}` : ''}`,
  };
}
