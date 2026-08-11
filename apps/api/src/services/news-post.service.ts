import { writeAuditLog } from '@lib/audit-log';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as newsPostRepo from '@repositories/news-post.repository';

interface NewsPostInput {
  titleEn: string;
  titleTe?: string;
  bodyEn?: string;
  bodyTe?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  featuredImageUrl?: string;
  category?: string;
  tags?: string[];
  metaTitleEn?: string;
  metaDescriptionEn?: string;
}

/** `tags` is stored as JSON text (`String @db.LongText` — MySQL has no native
 * scalar-array column type, see schema.prisma) — parsed back to `string[]`
 * here so every caller keeps the same `string[]` contract as before. */
export function toNewsPostDto<T extends { tags: string }>(
  row: T,
): Omit<T, 'tags'> & { tags: string[] } {
  return { ...row, tags: JSON.parse(row.tags) as string[] };
}

export async function listNewsPosts(
  filters: { status?: string; category?: string; search?: string },
  page: number,
  pageSize: number,
) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await newsPostRepo.findMany({ ...filters, skip, take });
  return paginate(rows.map(toNewsPostDto), total, { page, pageSize });
}

export async function getNewsPost(id: string) {
  const post = await newsPostRepo.findById(id);
  if (!post) throw ApiError.notFound('News post not found');
  return toNewsPostDto(post);
}

export async function getPublishedNewsPostBySlug(slug: string) {
  const post = await newsPostRepo.findBySlug(slug);
  if (!post) throw ApiError.notFound('News post not found');
  return toNewsPostDto(post);
}

export async function createNewsPost(input: NewsPostInput, authorAdminId: string) {
  const post = await newsPostRepo.create({
    ...input,
    tags: JSON.stringify(input.tags ?? []),
    publishedAt: input.status === 'published' ? new Date() : undefined,
    author: { connect: { id: authorAdminId } },
  });

  await writeAuditLog({
    adminUserId: authorAdminId,
    action: input.status === 'published' ? 'PUBLISHED' : 'CREATED',
    entityType: 'news_post',
    entityId: post.id,
    afterState: input,
  });

  return toNewsPostDto(post);
}

export async function updateNewsPost(
  id: string,
  input: Partial<NewsPostInput>,
  updatedByAdminId: string,
) {
  const before = await getNewsPost(id);
  const becomingPublished = input.status === 'published' && before.status !== 'published';

  const updated = await newsPostRepo.update(id, {
    ...input,
    tags: input.tags !== undefined ? JSON.stringify(input.tags) : undefined,
    ...(becomingPublished ? { publishedAt: new Date() } : {}),
  });

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: becomingPublished ? 'PUBLISHED' : 'UPDATED',
    entityType: 'news_post',
    entityId: id,
    beforeState: { status: before.status },
    afterState: input,
  });

  return toNewsPostDto(updated);
}

export async function deleteNewsPost(id: string, deletedByAdminId: string) {
  await getNewsPost(id);
  await newsPostRepo.softDelete(id);
  await writeAuditLog({
    adminUserId: deletedByAdminId,
    action: 'DELETED',
    entityType: 'news_post',
    entityId: id,
  });
}
