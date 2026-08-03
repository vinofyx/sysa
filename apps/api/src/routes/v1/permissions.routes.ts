import { Router } from 'express';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import * as permissionService from '@services/permission.service';

export const permissionsRouter = Router();

permissionsRouter.use(authenticate);

permissionsRouter.get('/', requirePermission('permissions:view'), async (_req, res, next) => {
  try {
    const permissions = await permissionService.listPermissions();
    res.status(200).json({ permissions });
  } catch (error) {
    next(error);
  }
});
