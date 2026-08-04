import { uploadBuffer } from '@integrations/storage/cloudinary-upload';
import { sendMail } from '@integrations/email/mailer';
import { donationReceiptEmail } from '@integrations/email/templates/donation.templates';
import { logger } from '@lib/logger';

import * as receiptRepo from '@repositories/receipt.repository';
import { generateReceiptPdf } from '@services/receipt-pdf.service';

/**
 * Ensures a donation has both a `Receipt` row and a generated PDF uploaded to
 * Cloudinary, in one call — the single entry point every donation-completion
 * path (online verify/webhook, manual entry, bank-transfer verification)
 * should use instead of calling `receiptRepo.createForDonation` directly.
 *
 * PDF generation/upload failure never blocks the donation being marked
 * complete — the receipt row still exists (donor sees "receipt pending");
 * failures are logged so Finance can regenerate manually if needed.
 */
export async function issueReceipt(donationId: string) {
  let receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  if (!receipt) {
    await receiptRepo.createForDonation(donationId);
    receipt = await receiptRepo.findByDonationIdWithDonation(donationId);
  }
  if (!receipt) throw new Error(`Failed to create receipt for donation ${donationId}`);
  if (receipt.pdfUrl) return receipt;

  try {
    const pdfBuffer = await generateReceiptPdf({
      receiptNumber: receipt.receiptNumber,
      issuedAt: receipt.issuedAt,
      donorName: receipt.donation.donor.name,
      donorEmail: receipt.donation.donor.email,
      panNumberMasked: receipt.donation.donor.panNumberMasked,
      categoryName: receipt.donation.category.nameEn,
      amount: receipt.donation.amount,
      currency: receipt.donation.currency,
      paymentMethod: receipt.donation.paymentMethod,
      paymentReference: receipt.donation.paymentGatewayRef,
      donationDate: receipt.donation.completedAt ?? receipt.donation.createdAt,
    });

    const upload = await uploadBuffer(pdfBuffer, { folder: 'sysa/receipts', resourceType: 'raw' });
    const updated = await receiptRepo.updatePdfUrl(receipt.id, upload.url);

    const email = donationReceiptEmail({
      donorName: receipt.donation.donor.name,
      amount: Number(receipt.donation.amount),
      currency: receipt.donation.currency,
      categoryName: receipt.donation.category.nameEn,
      receiptNumber: receipt.receiptNumber,
      receiptUrl: upload.url,
    });
    await sendMail({ to: receipt.donation.donor.email, ...email });

    return updated;
  } catch (error) {
    logger.error('Receipt PDF generation/upload failed — receipt row still created', {
      donationId,
      receiptId: receipt.id,
      error: error instanceof Error ? error.message : error,
    });
    return receipt;
  }
}
