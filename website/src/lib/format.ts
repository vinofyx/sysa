/** Receipt amounts: whole rupees without decimals, any paise always with two
 * places — never rounded, so the page matches the PDF exactly. */
export function formatReceiptAmount(value: string | number, currency = 'INR'): string {
  const amount = Number(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Receipt date and time in IST, like the PDF ("16 Oct 2026, 01:15 am IST"). */
export function formatReceiptDateTime(value: string | Date): string {
  const date = new Date(value);
  const day = date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${day}, ${time} IST`;
}

export function formatCurrency(value: string | number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}
