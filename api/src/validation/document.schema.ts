import { z } from 'zod';

export const documentCategorySchema = z.enum([
  'registration_certificate',
  'certificate_12ab',
  'certificate_80g',
  'pan_card',
  'annual_report',
  'audit_report',
  'financial_statement',
]);

export const createDocumentSchema = z.object({
  category: documentCategorySchema,
  titleEn: z.string().min(1).max(200),
  titleTe: z.string().max(200).optional(),
  publishedDate: z.coerce.date().optional(),
  publicVisible: z.coerce.boolean().default(false),
});

export const updateDocumentSchema = z.object({
  titleEn: z.string().min(1).max(200).optional(),
  titleTe: z.string().max(200).optional(),
  publishedDate: z.coerce.date().optional(),
  publicVisible: z.coerce.boolean().optional(),
});

export const listDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: documentCategorySchema.optional(),
});

export const listPublicDocumentsQuerySchema = z.object({
  category: documentCategorySchema.optional(),
});
