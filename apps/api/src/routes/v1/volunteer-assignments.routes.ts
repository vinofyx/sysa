import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  createVolunteerAssignmentSchema,
  listAssignmentsQuerySchema,
  updateVolunteerAssignmentSchema,
} from '@validation/volunteer-assignment.schema';
import * as assignmentService from '@services/volunteer-assignment.service';

export const volunteerAssignmentsRouter = Router();

volunteerAssignmentsRouter.use(authenticate);

volunteerAssignmentsRouter.get(
  '/',
  requirePermission('volunteer_assignments:view'),
  validate({ query: listAssignmentsQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, ...filters } = req.query as unknown as z.infer<
        typeof listAssignmentsQuerySchema
      >;
      const result = await assignmentService.listAssignments(filters, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

volunteerAssignmentsRouter.get(
  '/:id',
  requirePermission('volunteer_assignments:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const assignment = await assignmentService.getAssignment(id);
      res.status(200).json({ data: assignment });
    } catch (error) {
      next(error);
    }
  },
);

volunteerAssignmentsRouter.post(
  '/',
  requirePermission('volunteer_assignments:manage'),
  validate({ body: createVolunteerAssignmentSchema }),
  async (req, res, next) => {
    try {
      const assignment = await assignmentService.createAssignment(req.body, req.user!.id);
      res.status(201).json({ data: assignment });
    } catch (error) {
      next(error);
    }
  },
);

volunteerAssignmentsRouter.patch(
  '/:id',
  requirePermission('volunteer_assignments:manage'),
  validate({ params: idParamSchema, body: updateVolunteerAssignmentSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const assignment = await assignmentService.updateAssignment(id, req.body, req.user!.id);
      res.status(200).json({ data: assignment });
    } catch (error) {
      next(error);
    }
  },
);
