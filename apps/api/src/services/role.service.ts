import { writeAuditLog } from '@lib/audit-log';
import { ApiError } from '@utils/api-error';

import * as roleRepo from '@repositories/role.repository';
import * as permissionRepo from '@repositories/permission.repository';

/** Seeded system roles that cannot be renamed or deleted — see prisma/seed.ts. */
const PROTECTED_ROLE_NAMES = new Set(['Super Admin']);

function toPublicRole(role: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  rolePermissions: { permission: { id: string; code: string; description: string | null } }[];
}) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.rolePermissions.map((rp) => rp.permission),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export async function listRoles() {
  const roles = await roleRepo.findAll();
  return roles.map(toPublicRole);
}

export async function getRole(id: string) {
  const role = await roleRepo.findById(id);
  if (!role) throw ApiError.notFound('Role not found');
  return toPublicRole(role);
}

export async function createRole(
  input: { name: string; description?: string; permissionCodes: string[] },
  createdByAdminId: string,
) {
  const existing = await roleRepo.findByName(input.name);
  if (existing) {
    throw ApiError.conflict('A role with this name already exists.');
  }

  const role = await roleRepo.create({ name: input.name, description: input.description });
  const permissions = await permissionRepo.findByCodes(input.permissionCodes);
  const updated = await roleRepo.setPermissions(
    role.id,
    permissions.map((p) => p.id),
  );

  await writeAuditLog({
    adminUserId: createdByAdminId,
    action: 'ROLE_CREATED',
    entityType: 'role',
    entityId: role.id,
    afterState: { name: input.name, permissions: input.permissionCodes },
  });

  return toPublicRole(updated!);
}

export async function updateRole(
  id: string,
  input: { name?: string; description?: string; permissionCodes?: string[] },
  updatedByAdminId: string,
) {
  const existing = await roleRepo.findById(id);
  if (!existing) {
    throw ApiError.notFound('Role not found');
  }
  if (PROTECTED_ROLE_NAMES.has(existing.name) && (input.name || input.permissionCodes)) {
    throw ApiError.forbidden(
      `"${existing.name}" is a protected system role and cannot have its name or permissions changed.`,
    );
  }

  await roleRepo.update(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
  });

  if (input.permissionCodes) {
    const permissions = await permissionRepo.findByCodes(input.permissionCodes);
    await roleRepo.setPermissions(
      id,
      permissions.map((p) => p.id),
    );
  }

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'ROLE_UPDATED',
    entityType: 'role',
    entityId: id,
    beforeState: { name: existing.name },
    afterState: input,
  });

  return getRole(id);
}

export async function deleteRole(id: string, deletedByAdminId: string) {
  const existing = await roleRepo.findById(id);
  if (!existing) {
    throw ApiError.notFound('Role not found');
  }
  if (PROTECTED_ROLE_NAMES.has(existing.name)) {
    throw ApiError.forbidden(
      `"${existing.name}" is a protected system role and cannot be deleted.`,
    );
  }

  const usersWithRole = await roleRepo.countAdminUsersWithRole(id);
  if (usersWithRole > 0) {
    throw ApiError.conflict(
      `Cannot delete this role — ${usersWithRole} user(s) are still assigned to it. Reassign them first.`,
    );
  }

  await roleRepo.remove(id);
  await writeAuditLog({
    adminUserId: deletedByAdminId,
    action: 'ROLE_DELETED',
    entityType: 'role',
    entityId: id,
    beforeState: { name: existing.name },
  });
}
