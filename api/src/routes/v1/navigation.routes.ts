import { buildSimpleCrudRouter } from '@lib/simple-crud-router';
import * as navigationMenuItemRepo from '@repositories/navigation-menu-item.repository';
import {
  createNavigationMenuItemSchema,
  updateNavigationMenuItemSchema,
} from '@validation/navigation-menu-item.schema';

export const navigationRouter = buildSimpleCrudRouter(navigationMenuItemRepo, {
  entityType: 'navigation_menu_item',
  viewPermission: 'navigation:view',
  managePermission: 'navigation:manage',
  createSchema: createNavigationMenuItemSchema,
  updateSchema: updateNavigationMenuItemSchema,
  supportsReorder: true,
});
