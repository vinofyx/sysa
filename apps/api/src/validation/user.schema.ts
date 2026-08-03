import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('Enter a valid email address'),
  roleId: z.string().uuid('Invalid role id'),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    roleId: z.string().uuid('Invalid role id').optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  roleId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user id'),
});
