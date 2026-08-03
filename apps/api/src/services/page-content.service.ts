import type { Prisma } from '@prisma/client';

import { writeAuditLog } from '@lib/audit-log';

import * as pageContentRepo from '@repositories/page-content.repository';

export async function getPageContent(pageKey: string) {
  const content = await pageContentRepo.findByKey(pageKey);
  if (!content) {
    // Not-yet-published content is a normal, expected state (see
    // documentation/03-Functional-Requirements.md's "Coming Soon" pattern) —
    // return an empty shell rather than a 404 so the public site can render a
    // graceful placeholder instead of an error.
    return { pageKey, blocksEn: {}, blocksTe: null, updatedAt: null };
  }
  return content;
}

export async function listAllPageContent() {
  return pageContentRepo.findAll();
}

export async function updatePageContent(
  pageKey: string,
  input: { blocksEn: Record<string, unknown>; blocksTe?: Record<string, unknown> },
  updatedByAdminId: string,
) {
  const before = await pageContentRepo.findByKey(pageKey);
  const updated = await pageContentRepo.upsert(pageKey, {
    blocksEn: input.blocksEn as Prisma.InputJsonValue,
    blocksTe: input.blocksTe as Prisma.InputJsonValue | undefined,
    editor: { connect: { id: updatedByAdminId } },
  });

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: before ? 'UPDATED' : 'CREATED',
    entityType: 'page_content',
    entityId: pageKey,
    beforeState: before ?? undefined,
    afterState: input,
  });

  return updated;
}
