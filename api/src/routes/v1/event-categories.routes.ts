import { buildSimpleCrudRouter } from '@lib/simple-crud-router';
import * as eventCategoryRepo from '@repositories/event-category.repository';
import {
  createEventCategorySchema,
  updateEventCategorySchema,
} from '@validation/event-category.schema';

export const eventCategoriesRouter = buildSimpleCrudRouter(eventCategoryRepo, {
  entityType: 'event_category',
  viewPermission: 'event_categories:view',
  managePermission: 'event_categories:manage',
  createSchema: createEventCategorySchema,
  updateSchema: updateEventCategorySchema,
});
