import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  description: z.string().max(500).optional(),
  permissionCodes: z.array(z.string()).default([]),
});

export const updateRoleSchema = z
  .object({
    name: z.string().min(2).max(60).optional(),
    description: z.string().max(500).optional(),
    permissionCodes: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const roleIdParamSchema = z.object({
  id: z.string().uuid('Invalid role id'),
});
