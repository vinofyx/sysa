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

export async function listNewsPosts(
  filters: { status?: string; category?: string; search?: string },
  page: number,
  pageSize: number,
) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await newsPostRepo.findMany({ ...filters, skip, take });
  return paginate(rows, total, { page, pageSize });
}

export async function getNewsPost(id: string) {
  const post = await newsPostRepo.findById(id);
  if (!post) throw ApiError.notFound('News post not found');
  return post;
}

export async function getPublishedNewsPostBySlug(slug: string) {
  const post = await newsPostRepo.findBySlug(slug);
  if (!post) throw ApiError.notFound('News post not found');
  return post;
}

export async function createNewsPost(input: NewsPostInput, authorAdminId: string) {
  const post = await newsPostRepo.create({
    ...input,
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

  return post;
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

  return updated;
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
