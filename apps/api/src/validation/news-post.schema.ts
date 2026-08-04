import { z } from 'zod';

export const createNewsPostSchema = z.object({
  titleEn: z.string().min(1).max(200),
  titleTe: z.string().max(200).optional(),
  bodyEn: z.string().max(20000).optional(),
  bodyTe: z.string().max(20000).optional(),
  slug: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featuredImageUrl: z.string().url().optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  metaTitleEn: z.string().max(200).optional(),
  metaDescriptionEn: z.string().max(500).optional(),
});

export const updateNewsPostSchema = createNewsPostSchema.partial();

export const listNewsPostsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  category: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
});
