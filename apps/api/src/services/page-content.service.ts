import { writeAuditLog } from '@lib/audit-log';

import * as pageContentRepo from '@repositories/page-content.repository';

/** `blocksEn`/`blocksTe` are stored as JSON text (`String @db.LongText` —
 * see schema.prisma) — parsed back into objects here so every caller of this
 * service keeps working with plain objects, same public API contract as before. */
function toPageContentDto<T extends { blocksEn: string; blocksTe: string | null }>(
  row: T,
): Omit<T, 'blocksEn' | 'blocksTe'> & {
  blocksEn: Record<string, unknown>;
  blocksTe: Record<string, unknown> | null;
} {
  return {
    ...row,
    blocksEn: JSON.parse(row.blocksEn) as Record<string, unknown>,
    blocksTe: row.blocksTe ? (JSON.parse(row.blocksTe) as Record<string, unknown>) : null,
  };
}

export async function getPageContent(pageKey: string) {
  const content = await pageContentRepo.findByKey(pageKey);
  if (!content) {
    // Not-yet-published content is a normal, expected state (see
    // documentation/03-Functional-Requirements.md's "Coming Soon" pattern) —
    // return an empty shell rather than a 404 so the public site can render a
    // graceful placeholder instead of an error.
    return { pageKey, blocksEn: {}, blocksTe: null, updatedAt: null };
  }
  return toPageContentDto(content);
}

export async function listAllPageContent() {
  const pages = await pageContentRepo.findAll();
  return pages.map(toPageContentDto);
}

export async function updatePageContent(
  pageKey: string,
  input: { blocksEn: Record<string, unknown>; blocksTe?: Record<string, unknown> },
  updatedByAdminId: string,
) {
  const before = await pageContentRepo.findByKey(pageKey);
  const updated = await pageContentRepo.upsert(pageKey, {
    blocksEn: JSON.stringify(input.blocksEn),
    blocksTe: input.blocksTe ? JSON.stringify(input.blocksTe) : undefined,
    editorId: updatedByAdminId,
  });

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: before ? 'UPDATED' : 'CREATED',
    entityType: 'page_content',
    entityId: pageKey,
    beforeState: before ?? undefined,
    afterState: input,
  });

  return toPageContentDto(updated);
}
