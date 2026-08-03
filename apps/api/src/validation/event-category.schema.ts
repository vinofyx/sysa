import { z } from 'zod';

export const createEventCategorySchema = z.object({
  nameEn: z.string().min(1).max(150),
  nameTe: z.string().max(150).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  active: z.boolean().default(true),
});

export const updateEventCategorySchema = createEventCategorySchema.partial();
