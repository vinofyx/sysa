import multer from 'multer';

import { ApiError } from '@utils/api-error';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/**
 * In-memory Multer storage — files are streamed straight to Cloudinary
 * (src/integrations/storage/cloudinary-upload.ts) and never written to local
 * disk, so there is nothing to clean up and no local-disk-fills-up failure
 * mode on the API server.
 */
function createUploader(allowedMimeTypes: Set<string>) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        callback(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
        return;
      }
      callback(null, true);
    },
  });
}

export const imageUpload = createUploader(ALLOWED_IMAGE_MIME_TYPES);
export const documentUpload = createUploader(
  new Set([...ALLOWED_DOCUMENT_MIME_TYPES, ...ALLOWED_IMAGE_MIME_TYPES]),
);
