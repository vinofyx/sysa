import { z } from 'zod';

export const eventStatusSchema = z.enum(['draft', 'published', 'cancelled', 'completed']);

export const createEventSchema = z.object({
  categoryId: z.string().uuid().optional(),
  titleEn: z.string().min(1).max(200),
  titleTe: z.string().max(200).optional(),
  descriptionEn: z.string().max(5000).optional(),
  descriptionTe: z.string().max(5000).optional(),
  slug: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  location: z.string().max(300).optional(),
  capacity: z.number().int().positive().optional(),
  registrationDeadline: z.coerce.date().optional(),
  featuredImageUrl: z.string().url().optional(),
  status: eventStatusSchema.default('draft'),
  metaTitleEn: z.string().max(200).optional(),
  metaDescriptionEn: z.string().max(500).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: eventStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});
