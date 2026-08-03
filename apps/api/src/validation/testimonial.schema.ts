import { z } from 'zod';

export const createTestimonialSchema = z.object({
  authorName: z.string().min(1).max(150),
  authorRole: z.string().max(150).optional(),
  quoteEn: z.string().min(1).max(2000),
  quoteTe: z.string().max(2000).optional(),
  photoUrl: z.string().url().optional(),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();
