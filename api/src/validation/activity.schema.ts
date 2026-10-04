import { z } from 'zod';

export const createActivitySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  titleEn: z.string().min(1).max(200),
  titleTe: z.string().max(200).optional(),
  descriptionEn: z.string().max(3000).optional(),
  descriptionTe: z.string().max(3000).optional(),
  iconOrImageUrl: z.string().url().optional(),
  linkedCategoryId: z.string().uuid().optional(),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateActivitySchema = createActivitySchema.partial();
