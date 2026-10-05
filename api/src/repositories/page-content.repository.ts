import { prisma } from '@lib/prisma';

export function findByKey(pageKey: string) {
  return prisma.pageContent.findUnique({ where: { pageKey } });
}

export function findAll() {
  return prisma.pageContent.findMany({ orderBy: { pageKey: 'asc' } });
}

/** `blocksEn`/`blocksTe` are `String @db.LongText` (see schema.prisma) — callers
 * pass already-serialized JSON strings, matching `page-content.service.ts`. */
export function upsert(
  pageKey: string,
  data: { blocksEn: string; blocksTe?: string | null; editorId: string },
) {
  return prisma.pageContent.upsert({
    where: { pageKey },
    update: {
      blocksEn: data.blocksEn,
      blocksTe: data.blocksTe,
      editor: { connect: { id: data.editorId } },
    },
    create: {
      pageKey,
      blocksEn: data.blocksEn,
      blocksTe: data.blocksTe,
      editor: { connect: { id: data.editorId } },
    },
  });
}
