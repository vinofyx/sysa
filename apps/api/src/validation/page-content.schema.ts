import { z } from 'zod';

/** `home`, `about`, and `contact` are the pages defined in the sitemap
 * (design/02-Sitemap.md) that are singleton, section-based content rather than
 * repeatable collections (Events/Gallery/etc. have their own dedicated models). */
export const pageKeySchema = z.enum(['home', 'about', 'contact']);

export const pageKeyParamSchema = z.object({ pageKey: pageKeySchema });

export const updatePageContentSchema = z.object({
  blocksEn: z.record(z.string(), z.unknown()),
  blocksTe: z.record(z.string(), z.unknown()).optional(),
});
