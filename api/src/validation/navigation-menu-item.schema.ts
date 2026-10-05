import { z } from 'zod';

export const createNavigationMenuItemSchema = z.object({
  labelEn: z.string().min(1).max(80),
  labelTe: z.string().max(80).optional(),
  url: z.string().min(1).max(500),
  location: z.enum(['header', 'footer']),
  parentId: z.string().uuid().optional(),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateNavigationMenuItemSchema = createNavigationMenuItemSchema.partial();
