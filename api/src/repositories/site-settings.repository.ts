import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

const SETTINGS_ID = 'default';

export function get() {
  return prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
}

export function upsert(data: Prisma.SiteSettingsUpdateInput) {
  return prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...(data as Prisma.SiteSettingsCreateInput) },
  });
}
