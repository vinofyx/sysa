import { z } from 'zod';

export const createHeroBannerSchema = z.object({
  titleEn: z.string().min(1).max(200),
  titleTe: z.string().max(200).optional(),
  subtitleEn: z.string().max(400).optional(),
  subtitleTe: z.string().max(400).optional(),
  imageUrl: z.string().url('A valid image URL is required'),
  ctaLabelEn: z.string().max(60).optional(),
  ctaLabelTe: z.string().max(60).optional(),
  ctaUrl: z.string().max(500).optional(),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateHeroBannerSchema = createHeroBannerSchema.partial();
