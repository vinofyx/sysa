import { writeAuditLog } from '@lib/audit-log';
import { ApiError } from '@utils/api-error';

import * as adminUserRepo from '@repositories/admin-user.repository';

function toProfile(user: {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: { name: string };
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function getMyProfile(adminUserId: string) {
  const user = await adminUserRepo.findById(adminUserId);
  if (!user) throw ApiError.notFound('User not found');
  return toProfile(user);
}

/**
 * A user may only edit their own display name here — email, role, and active
 * status changes go through the Super-Admin-only User API (services/user.service.ts),
 * never through self-service, per the least-privilege principle in
 * documentation/10-Roles-and-Permissions.md.
 */
export async function updateMyProfile(adminUserId: string, input: { name: string }) {
  const user = await adminUserRepo.update(adminUserId, { name: input.name });

  await writeAuditLog({
    adminUserId,
    action: 'PROFILE_UPDATED',
    entityType: 'admin_user',
    entityId: adminUserId,
    afterState: input,
  });

  return toProfile(user);
}
