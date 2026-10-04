import { z } from 'zod';

/** Public — design/03-User-Flows.md F-04 (registration) / F-05 (internship). */
export const registerVolunteerSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email(),
  phone: z.string().min(1).max(20),
  type: z.enum(['volunteer', 'internship']),
  areaOfInterest: z.string().max(500).optional(),
  academicBackground: z.string().max(1000).optional(),
  resumeUrl: z.string().url().optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'accepted', 'not_selected']),
  internalNote: z.string().max(1000).optional(),
});

export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['volunteer', 'internship']).optional(),
  status: z.enum(['submitted', 'under_review', 'accepted', 'not_selected']).optional(),
});

export const listVolunteersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
});
