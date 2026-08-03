import { z } from 'zod';

export const socialPlatformSchema = z.enum([
  'facebook',
  'instagram',
  'twitter',
  'youtube',
  'linkedin',
  'whatsapp',
]);

export const createSocialMediaLinkSchema = z.object({
  platform: socialPlatformSchema,
  url: z.string().url('A valid URL is required'),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateSocialMediaLinkSchema = createSocialMediaLinkSchema.partial();
