import { z } from 'zod';

/**
 * Base list-query schema every module's `list*Schema` extends — keeps
 * pagination/sort/search query-param handling identical across all Phase 5
 * modules (API consistency requirement).
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export function searchSchema(maxLength = 200) {
  return z.string().max(maxLength).optional();
}

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export const bulkIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one id is required'),
});

export const bulkReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        displayOrder: z.coerce.number().int().min(0),
      }),
    )
    .min(1, 'At least one item is required'),
});
