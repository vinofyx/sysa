import * as permissionRepo from '@repositories/permission.repository';

export async function listPermissions() {
  const permissions = await permissionRepo.findAll();
  return permissions.map((p) => ({ id: p.id, code: p.code, description: p.description }));
}
