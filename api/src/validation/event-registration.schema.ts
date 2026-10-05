import { z } from 'zod';

export const registerForEventSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(150),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
});

export const listEventRegistrationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  eventId: z.string().uuid().optional(),
  status: z.enum(['registered', 'cancelled', 'waitlisted']).optional(),
});
