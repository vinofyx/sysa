import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

const withPermissions = {
  rolePermissions: { include: { permission: true } },
} satisfies Prisma.RoleInclude;

export function findAll() {
  return prisma.role.findMany({ include: withPermissions, orderBy: { name: 'asc' } });
}

export function findById(id: string) {
  return prisma.role.findUnique({ where: { id }, include: withPermissions });
}

export function findByName(name: string) {
  return prisma.role.findUnique({ where: { name }, include: withPermissions });
}

export function create(data: { name: string; description?: string }) {
  return prisma.role.create({ data, include: withPermissions });
}

export function update(id: string, data: Prisma.RoleUpdateInput) {
  return prisma.role.update({ where: { id }, data, include: withPermissions });
}

export function remove(id: string) {
  return prisma.role.delete({ where: { id } });
}

export function countAdminUsersWithRole(id: string) {
  return prisma.adminUser.count({ where: { roleId: id } });
}

export async function setPermissions(roleId: string, permissionIds: string[]) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    skipDuplicates: true,
  });
  return findById(roleId);
}
