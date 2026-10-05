import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  listApplicationsQuerySchema,
  listVolunteersQuerySchema,
  registerVolunteerSchema,
  updateApplicationStatusSchema,
} from '@validation/volunteer.schema';
import * as volunteerService from '@services/volunteer.service';

export const volunteersRouter = Router();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public — design/03-User-Flows.md F-04/F-05.
volunteersRouter.post(
  '/register',
  registrationLimiter,
  validate({ body: registerVolunteerSchema }),
  async (req, res, next) => {
    try {
      const application = await volunteerService.registerVolunteer(req.body);
      res.status(201).json({
        data: application,
        message: 'Thank you — we will be in touch soon.',
      });
    } catch (error) {
      next(error);
    }
  },
);

volunteersRouter.use(authenticate);

// NOTE: the /applications/* routes are registered before the generic /:id
// route below so Express doesn't match "applications" as a volunteer id.

volunteersRouter.get(
  '/applications/list',
  requirePermission('volunteers:view'),
  validate({ query: listApplicationsQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, ...filters } = req.query as unknown as z.infer<
        typeof listApplicationsQuerySchema
      >;
      const result = await volunteerService.listApplications(filters, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

volunteersRouter.get(
  '/applications/:id',
  requirePermission('volunteers:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const application = await volunteerService.getApplication(id);
      res.status(200).json({ data: application });
    } catch (error) {
      next(error);
    }
  },
);

volunteersRouter.patch(
  '/applications/:id/status',
  requirePermission('volunteers:manage_status'),
  validate({ params: idParamSchema, body: updateApplicationStatusSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const { status, internalNote } = req.body as z.infer<typeof updateApplicationStatusSchema>;
      const application = await volunteerService.updateApplicationStatus(
        id,
        status,
        internalNote,
        req.user!.id,
      );
      res.status(200).json({ data: application });
    } catch (error) {
      next(error);
    }
  },
);

volunteersRouter.get(
  '/',
  requirePermission('volunteers:view'),
  validate({ query: listVolunteersQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, search } = req.query as unknown as z.infer<
        typeof listVolunteersQuerySchema
      >;
      const result = await volunteerService.listVolunteers(search, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

volunteersRouter.get(
  '/:id',
  requirePermission('volunteers:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const volunteer = await volunteerService.getVolunteer(id);
      res.status(200).json({ data: volunteer });
    } catch (error) {
      next(error);
    }
  },
);
