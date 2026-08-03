import { z } from 'zod';

export const createDonationCategorySchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, and underscores only'),
  nameEn: z.string().min(1).max(150),
  nameTe: z.string().max(150).optional(),
  descriptionEn: z.string().max(2000).optional(),
  descriptionTe: z.string().max(2000).optional(),
  hasPresetTiers: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const updateDonationCategorySchema = createDonationCategorySchema.partial();
