import { buildSimpleCrudRouter } from '@lib/simple-crud-router';
import * as activityRepo from '@repositories/activity.repository';
import { createActivitySchema, updateActivitySchema } from '@validation/activity.schema';

export const activitiesRouter = buildSimpleCrudRouter(activityRepo, {
  entityType: 'activity',
  viewPermission: 'activities:view',
  managePermission: 'activities:manage',
  createSchema: createActivitySchema,
  updateSchema: updateActivitySchema,
  supportsReorder: true,
});
