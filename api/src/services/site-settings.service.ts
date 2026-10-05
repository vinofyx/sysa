import { writeAuditLog } from '@lib/audit-log';

import * as siteSettingsRepo from '@repositories/site-settings.repository';

export async function getSiteSettings() {
  const settings = await siteSettingsRepo.get();
  // Guaranteed to exist post-seed, but degrade gracefully rather than 500 if a
  // fresh, unseeded database is queried directly.
  return settings ?? (await siteSettingsRepo.upsert({}));
}

export async function updateSiteSettings(input: Record<string, unknown>, updatedByAdminId: string) {
  const before = await siteSettingsRepo.get();
  const updated = await siteSettingsRepo.upsert({
    ...input,
    editor: { connect: { id: updatedByAdminId } },
  });

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'SETTINGS_UPDATED',
    entityType: 'site_settings',
    entityId: 'default',
    beforeState: before ?? undefined,
    afterState: input,
  });

  return updated;
}
