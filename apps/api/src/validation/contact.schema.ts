import { z } from 'zod';

export const submitContactFormSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  message: z.string().min(1).max(2000),
});

export const subscribeNewsletterSchema = z.object({
  email: z.string().email(),
});
