import { Router } from 'express';

import { healthRouter } from '@routes/v1/health.routes';
import { authRouter } from '@routes/v1/auth.routes';
import { usersRouter } from '@routes/v1/users.routes';
import { rolesRouter } from '@routes/v1/roles.routes';
import { permissionsRouter } from '@routes/v1/permissions.routes';
import { profileRouter } from '@routes/v1/profile.routes';

/**
 * API v1 router — the versioning root described in documentation/13-API-Requirements.md
 * and design/13-API-Architecture.md §6. All v1 resource routers mount here.
 *
 * Business-domain routers (donations, content, volunteers, events, gallery, etc.) are
 * added in the feature-development phase — see DEVELOPMENT_PROGRESS.md for the
 * deferred scope. This phase (4) adds the core application framework: auth, RBAC
 * (users/roles/permissions), and profile.
 */
export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/roles', rolesRouter);
v1Router.use('/permissions', permissionsRouter);
v1Router.use('/profile', profileRouter);
