import { v2 as cloudinary } from 'cloudinary';

import { env } from '@config/env';
import { logger } from '@lib/logger';

/**
 * Cloudinary client initialization — foundational config only.
 * Upload/transform workflows for gallery media and compliance documents
 * (see documentation/09-Admin-Modules.md §7, §12) are implemented in the feature phase.
 */
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  logger.warn(
    'Cloudinary credentials not configured — media upload features will be unavailable until CLOUDINARY_* env vars are set.',
  );
}

export { cloudinary };
