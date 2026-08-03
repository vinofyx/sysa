import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  createNewsPostSchema,
  listNewsPostsQuerySchema,
  updateNewsPostSchema,
} from '@validation/news-post.schema';
import * as newsPostService from '@services/news-post.service';
import { prisma } from '@lib/prisma';

export const newsRouter = Router();

// Public — Events & News listing (design/02-Sitemap.md).
newsRouter.get('/public', async (_req, res, next) => {
  try {
    const posts = await prisma.eventNewsPost.findMany({
      where: { type: 'news', deletedAt: null, status: 'published' },
      orderBy: { publishedAt: 'desc' },
    });
    res.status(200).json({ posts });
  } catch (error) {
    next(error);
  }
});

newsRouter.get('/public/:slug', async (req, res, next) => {
  try {
    const post = await newsPostService.getPublishedNewsPostBySlug(req.params.slug);
    res.status(200).json({ post });
  } catch (error) {
    next(error);
  }
});

newsRouter.use(authenticate);

newsRouter.get(
  '/',
  requirePermission('news:view'),
  validate({ query: listNewsPostsQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, ...filters } = req.query as unknown as z.infer<
        typeof listNewsPostsQuerySchema
      >;
      const result = await newsPostService.listNewsPosts(filters, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

newsRouter.get(
  '/:id',
  requirePermission('news:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const post = await newsPostService.getNewsPost(id);
      res.status(200).json({ data: post });
    } catch (error) {
      next(error);
    }
  },
);

newsRouter.post(
  '/',
  requirePermission('news:manage'),
  validate({ body: createNewsPostSchema }),
  async (req, res, next) => {
    try {
      const post = await newsPostService.createNewsPost(req.body, req.user!.id);
      res.status(201).json({ data: post });
    } catch (error) {
      next(error);
    }
  },
);

newsRouter.patch(
  '/:id',
  requirePermission('news:manage'),
  validate({ params: idParamSchema, body: updateNewsPostSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const post = await newsPostService.updateNewsPost(id, req.body, req.user!.id);
      res.status(200).json({ data: post });
    } catch (error) {
      next(error);
    }
  },
);

newsRouter.delete(
  '/:id',
  requirePermission('news:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await newsPostService.deleteNewsPost(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);
