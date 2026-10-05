import { buildSimpleCrudRouter } from '@lib/simple-crud-router';
import * as socialMediaLinkRepo from '@repositories/social-media-link.repository';
import {
  createSocialMediaLinkSchema,
  updateSocialMediaLinkSchema,
} from '@validation/social-media-link.schema';

export const socialLinksRouter = buildSimpleCrudRouter(socialMediaLinkRepo, {
  entityType: 'social_media_link',
  viewPermission: 'social_links:view',
  managePermission: 'social_links:manage',
  createSchema: createSocialMediaLinkSchema,
  updateSchema: updateSocialMediaLinkSchema,
  supportsReorder: true,
});
