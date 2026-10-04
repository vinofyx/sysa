import { generateRandomPassword, hashPassword } from '@lib/password';
import { writeAuditLog } from '@lib/audit-log';
import { ApiError } from '@utils/api-error';

import * as adminUserRepo from '@repositories/admin-user.repository';
import * as roleRepo from '@repositories/role.repository';
import * as sessionRepo from '@repositories/session.repository';
import { sendEmailVerification } from '@services/auth.service';

export interface CreateUserInput {
  name: string;
  email: string;
  roleId: string;
}

export interface UpdateUserInput {
  name?: string;
  roleId?: string;
  active?: boolean;
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: { name: string };
  active: boolean;
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
    active: user.active,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function listUsers(params: {
  page: number;
  pageSize: number;
  roleId?: string;
  active?: boolean;
  search?: string;
}) {
  const skip = (params.page - 1) * params.pageSize;
  const [users, total] = await adminUserRepo.findMany({
    skip,
    take: params.pageSize,
    roleId: params.roleId,
    active: params.active,
    search: params.search,
  });

  return {
    data: users.map(toPublicUser),
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}

export async function getUser(id: string) {
  const user = await adminUserRepo.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}

export async function createUser(input: CreateUserInput, createdByAdminId: string) {
  const existing = await adminUserRepo.findByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('A user with this email already exists.');
  }

  const role = await roleRepo.findById(input.roleId);
  if (!role) {
    throw ApiError.badRequest('The specified role does not exist.');
  }

  const passwordHash = await hashPassword(generateRandomPassword());
  const user = await adminUserRepo.create({
    name: input.name,
    email: input.email,
    passwordHash,
    roleId: input.roleId,
  });

  await writeAuditLog({
    adminUserId: createdByAdminId,
    action: 'USER_CREATED',
    entityType: 'admin_user',
    entityId: user.id,
    afterState: { name: user.name, email: user.email, roleId: user.roleId },
  });

  // Reuses the email-verification flow as the account-activation mechanism —
  // see the doc-comment on authService.resendVerificationByEmail for why a
  // separate "invite" flow was not built as well.
  await sendEmailVerification(user.id);

  return toPublicUser(user);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  updatedByAdminId: string,
): Promise<ReturnType<typeof toPublicUser>> {
  const existing = await adminUserRepo.findById(id);
  if (!existing) {
    throw ApiError.notFound('User not found');
  }

  if (input.roleId) {
    const role = await roleRepo.findById(input.roleId);
    if (!role) {
      throw ApiError.badRequest('The specified role does not exist.');
    }
  }

  const wasActive = existing.active;
  const updated = await adminUserRepo.update(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.roleId !== undefined ? { roleId: input.roleId } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  });

  // Deactivating a user should also kill their active sessions immediately.
  if (input.active === false && wasActive) {
    await sessionRepo.revokeAllForUser(id);
    await writeAuditLog({
      adminUserId: updatedByAdminId,
      action: 'USER_DEACTIVATED',
      entityType: 'admin_user',
      entityId: id,
    });
  } else if (input.active === true && !wasActive) {
    await writeAuditLog({
      adminUserId: updatedByAdminId,
      action: 'USER_REACTIVATED',
      entityType: 'admin_user',
      entityId: id,
    });
  }

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'USER_UPDATED',
    entityType: 'admin_user',
    entityId: id,
    beforeState: { name: existing.name, roleId: existing.roleId, active: existing.active },
    afterState: input,
  });

  return toPublicUser(updated);
}
