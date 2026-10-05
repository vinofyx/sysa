import { z } from 'zod';

export const createAppealSchema = z.object({
  categoryId: z.string().uuid(),
  titleEn: z.string().min(1).max(200),
  titleTe: z.string().max(200).optional(),
  descriptionEn: z.string().max(3000).optional(),
  descriptionTe: z.string().max(3000).optional(),
  targetAmount: z.coerce.number().positive(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
});

export const updateAppealSchema = createAppealSchema.partial();

export const listAppealsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});
