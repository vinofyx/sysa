import QRCode from 'qrcode';

/**
 * Renders a scannable UPI QR (the standard `upi://pay?pa=...` deep-link
 * encoded as a PNG) for a real, admin-configured UPI VPA — never a
 * placeholder/fake handle. `upiId` must come from `SiteSettings.upiId`
 * (the same CMS-managed value already shown on the Donate page's Bank
 * Details section), not be hardcoded here.
 */
export async function generateUpiQrBuffer(upiId: string, payeeName: string): Promise<Buffer> {
  const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&cu=INR`;
  return QRCode.toBuffer(uri, {
    type: 'png',
    width: 200,
    margin: 1,
    color: { dark: '#1A1D1A', light: '#FFFFFF' },
  });
}
