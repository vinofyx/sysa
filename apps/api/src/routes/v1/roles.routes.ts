import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { createRoleSchema, roleIdParamSchema, updateRoleSchema } from '@validation/role.schema';
import * as roleService from '@services/role.service';

export const rolesRouter = Router();

rolesRouter.use(authenticate);

rolesRouter.get('/', requirePermission('roles:view'), async (_req, res, next) => {
  try {
    const roles = await roleService.listRoles();
    res.status(200).json({ roles });
  } catch (error) {
    next(error);
  }
});

rolesRouter.get(
  '/:id',
  requirePermission('roles:view'),
  validate({ params: roleIdParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof roleIdParamSchema>;
      const role = await roleService.getRole(id);
      res.status(200).json({ role });
    } catch (error) {
      next(error);
    }
  },
);

rolesRouter.post(
  '/',
  requirePermission('roles:manage'),
  validate({ body: createRoleSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof createRoleSchema>;
      const role = await roleService.createRole(input, req.user!.id);
      res.status(201).json({ role });
    } catch (error) {
      next(error);
    }
  },
);

rolesRouter.patch(
  '/:id',
  requirePermission('roles:manage'),
  validate({ params: roleIdParamSchema, body: updateRoleSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof roleIdParamSchema>;
      const input = req.body as z.infer<typeof updateRoleSchema>;
      const role = await roleService.updateRole(id, input, req.user!.id);
      res.status(200).json({ role });
    } catch (error) {
      next(error);
    }
  },
);

rolesRouter.delete(
  '/:id',
  requirePermission('roles:manage'),
  validate({ params: roleIdParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof roleIdParamSchema>;
      await roleService.deleteRole(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);
