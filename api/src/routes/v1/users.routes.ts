import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from '@validation/user.schema';
import * as userService from '@services/user.service';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get(
  '/',
  requirePermission('users:view'),
  validate({ query: listUsersQuerySchema }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listUsersQuerySchema>;
      const result = await userService.listUsers({
        page: query.page,
        pageSize: query.pageSize,
        roleId: query.roleId,
        active: query.active,
        search: query.search,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

usersRouter.get(
  '/:id',
  requirePermission('users:view'),
  validate({ params: userIdParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof userIdParamSchema>;
      const user = await userService.getUser(id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },
);

usersRouter.post(
  '/',
  requirePermission('users:manage'),
  validate({ body: createUserSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof createUserSchema>;
      const user = await userService.createUser(input, req.user!.id);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  },
);

usersRouter.patch(
  '/:id',
  requirePermission('users:manage'),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof userIdParamSchema>;
      const input = req.body as z.infer<typeof updateUserSchema>;
      const user = await userService.updateUser(id, input, req.user!.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },
);
