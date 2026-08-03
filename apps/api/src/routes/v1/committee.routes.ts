import { buildSimpleCrudRouter } from '@lib/simple-crud-router';
import * as committeeMemberRepo from '@repositories/committee-member.repository';
import {
  createCommitteeMemberSchema,
  updateCommitteeMemberSchema,
} from '@validation/committee-member.schema';

export const committeeRouter = buildSimpleCrudRouter(committeeMemberRepo, {
  entityType: 'committee_member',
  viewPermission: 'committee:view',
  managePermission: 'committee:manage',
  createSchema: createCommitteeMemberSchema,
  updateSchema: updateCommitteeMemberSchema,
  supportsReorder: true,
});
