import { z } from 'zod';

export const createCommitteeMemberSchema = z.object({
  name: z.string().min(1).max(150),
  designation: z.string().min(1).max(100),
  photoUrl: z.string().url().optional(),
  bioEn: z.string().max(3000).optional(),
  bioTe: z.string().max(3000).optional(),
  mobile: z.string().max(20).optional(),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateCommitteeMemberSchema = createCommitteeMemberSchema.partial();
