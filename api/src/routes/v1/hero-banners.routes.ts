import { buildSimpleCrudRouter } from '@lib/simple-crud-router';
import * as heroBannerRepo from '@repositories/hero-banner.repository';
import { createHeroBannerSchema, updateHeroBannerSchema } from '@validation/hero-banner.schema';

export const heroBannersRouter = buildSimpleCrudRouter(heroBannerRepo, {
  entityType: 'hero_banner',
  viewPermission: 'banners:view',
  managePermission: 'banners:manage',
  createSchema: createHeroBannerSchema,
  updateSchema: updateHeroBannerSchema,
  supportsReorder: true,
});
