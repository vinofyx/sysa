import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  listEventRegistrationsQuerySchema,
  registerForEventSchema,
} from '@validation/event-registration.schema';
import * as eventRegistrationService from '@services/event-registration.service';

export const eventRegistrationsRouter = Router();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public — event registration form.
eventRegistrationsRouter.post(
  '/public',
  registrationLimiter,
  validate({ body: registerForEventSchema }),
  async (req, res, next) => {
    try {
      const registration = await eventRegistrationService.registerForEvent(req.body);
      res.status(201).json({ data: registration });
    } catch (error) {
      next(error);
    }
  },
);

eventRegistrationsRouter.use(authenticate);

eventRegistrationsRouter.get(
  '/',
  requirePermission('event_registrations:view'),
  validate({ query: listEventRegistrationsQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, ...filters } = req.query as unknown as z.infer<
        typeof listEventRegistrationsQuerySchema
      >;
      const result = await eventRegistrationService.listRegistrations(filters, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

eventRegistrationsRouter.post(
  '/:id/check-in',
  requirePermission('event_registrations:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const registration = await eventRegistrationService.checkInRegistration(id, req.user!.id);
      res.status(200).json({ data: registration });
    } catch (error) {
      next(error);
    }
  },
);

eventRegistrationsRouter.post(
  '/:id/cancel',
  requirePermission('event_registrations:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const registration = await eventRegistrationService.cancelRegistration(id, req.user!.id);
      res.status(200).json({ data: registration });
    } catch (error) {
      next(error);
    }
  },
);
