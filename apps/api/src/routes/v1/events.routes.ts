import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  createEventSchema,
  listEventsQuerySchema,
  updateEventSchema,
} from '@validation/event.schema';
import * as eventService from '@services/event.service';
import { prisma } from '@lib/prisma';

export const eventsRouter = Router();

// Public — Events & News listing (design/02-Sitemap.md).
eventsRouter.get('/public', async (_req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { deletedAt: null, status: 'published' },
      include: { category: true, _count: { select: { registrations: true } } },
      orderBy: { startDate: 'asc' },
    });
    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get('/public/:slug', async (req, res, next) => {
  try {
    const event = await eventService.getPublishedEventBySlug(req.params.slug);
    res.status(200).json({ event });
  } catch (error) {
    next(error);
  }
});

eventsRouter.use(authenticate);

eventsRouter.get(
  '/',
  requirePermission('events:view'),
  validate({ query: listEventsQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, ...filters } = req.query as unknown as z.infer<
        typeof listEventsQuerySchema
      >;
      const result = await eventService.listEvents(filters, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

eventsRouter.get(
  '/:id',
  requirePermission('events:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const event = await eventService.getEvent(id);
      res.status(200).json({ data: event });
    } catch (error) {
      next(error);
    }
  },
);

eventsRouter.post(
  '/',
  requirePermission('events:manage'),
  validate({ body: createEventSchema }),
  async (req, res, next) => {
    try {
      const event = await eventService.createEvent(req.body, req.user!.id);
      res.status(201).json({ data: event });
    } catch (error) {
      next(error);
    }
  },
);

eventsRouter.patch(
  '/:id',
  requirePermission('events:manage'),
  validate({ params: idParamSchema, body: updateEventSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const event = await eventService.updateEvent(id, req.body, req.user!.id);
      res.status(200).json({ data: event });
    } catch (error) {
      next(error);
    }
  },
);

eventsRouter.delete(
  '/:id',
  requirePermission('events:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await eventService.deleteEvent(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);
