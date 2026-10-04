import { Readable } from 'node:stream';

import { cloudinary } from '@integrations/storage/cloudinary.client';
import { env } from '@config/env';
import { ApiError } from '@utils/api-error';

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format: string;
  resourceType: string;
}

interface UploadOptions {
  folder: string;
  resourceType?: 'image' | 'raw' | 'auto';
}

/**
 * Uploads a buffer to Cloudinary with automatic quality/format optimization
 * (`quality: auto`, `fetch_format: auto` — the "Image Optimization" Phase 5
 * requirement) applied at upload time via an eager transformation, so every
 * downstream consumer of the returned URL gets an optimized asset without
 * needing to know Cloudinary transformation syntax itself.
 */
export function uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
  if (!env.CLOUDINARY_CLOUD_NAME) {
    return Promise.reject(
      ApiError.internal('Media upload is not configured — set CLOUDINARY_* environment variables.'),
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType ?? 'image',
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error || !result) {
          reject(ApiError.internal(`Upload failed: ${error?.message ?? 'unknown error'}`));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          resourceType: result.resource_type,
        });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function deleteAsset(
  publicId: string,
  resourceType: 'image' | 'raw' = 'image',
): Promise<void> {
  if (!env.CLOUDINARY_CLOUD_NAME) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
