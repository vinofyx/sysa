import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import { cloudinary } from '@integrations/storage/cloudinary.client';
import { env } from '@config/env';

/** How long the provider may fetch the document. WhatsApp downloads it within
 * minutes of the send; a day covers provider retries. */
export const RECEIPT_MEDIA_TTL_SECONDS = 24 * 60 * 60;

/** The PDF must be a real, non-empty PDF before it is handed to a provider. */
export function assertPdf(pdf: Buffer): void {
  if (pdf.length === 0) throw new Error('Receipt PDF is empty');
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('Receipt PDF is not a valid PDF document');
  }
}

/**
 * Makes a receipt PDF fetchable by a messaging provider (WhatsApp document
 * header) without making it public: the freshly generated PDF is uploaded to
 * Cloudinary as a PRIVATE raw asset and only a signed, expiring download URL
 * (Cloudinary `utils.private_download_url`) is returned. The URL is passed to
 * the provider and never stored or logged; it stops working after `ttlSeconds`.
 *
 * Exposed as an object so tests can stub `createUrl` (no network in tests).
 */
export const receiptMedia = {
  async createUrl(
    pdf: Buffer,
    receiptNumber: string,
    ttlSeconds: number = RECEIPT_MEDIA_TTL_SECONDS,
  ): Promise<string> {
    assertPdf(pdf);
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error(
        'Receipt document link unavailable — media storage (CLOUDINARY_*) is not configured',
      );
    }
    // Unguessable id; the receipt number keeps it identifiable in the console.
    const publicId = `${receiptNumber}-${randomUUID()}.pdf`;
    await new Promise<void>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          type: 'private',
          folder: 'sysa/receipt-documents',
          public_id: publicId,
          overwrite: false,
        },
        (error, result) =>
          error || !result ? reject(new Error(error?.message ?? 'upload failed')) : resolve(),
      );
      Readable.from(pdf).pipe(upload);
    });
    return cloudinary.utils.private_download_url(`sysa/receipt-documents/${publicId}`, '', {
      resource_type: 'raw',
      type: 'private',
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    });
  },
};
