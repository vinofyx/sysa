import { z } from 'zod';

export const createVolunteerAssignmentSchema = z.object({
  volunteerId: z.string().uuid(),
  titleEn: z.string().min(1).max(200),
  descriptionEn: z.string().max(2000).optional(),
  assignedDate: z.coerce.date(),
  notes: z.string().max(1000).optional(),
});

export const updateVolunteerAssignmentSchema = z.object({
  titleEn: z.string().min(1).max(200).optional(),
  descriptionEn: z.string().max(2000).optional(),
  status: z.enum(['assigned', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().max(1000).optional(),
});

export const listAssignmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  volunteerId: z.string().uuid().optional(),
  status: z.enum(['assigned', 'in_progress', 'completed', 'cancelled']).optional(),
});
