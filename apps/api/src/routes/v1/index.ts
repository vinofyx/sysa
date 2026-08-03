import { Router } from 'express';

import { healthRouter } from '@routes/v1/health.routes';

/**
 * API v1 router — the versioning root described in documentation/13-API-Requirements.md
 * and design/13-API-Architecture.md §6. All v1 resource routers mount here.
 *
 * Business-domain routers (donations, content, volunteers, admin/*, etc.) are added in the
 * feature-development phase — see DEVELOPMENT_PROGRESS.md for the deferred scope.
 */
export const v1Router = Router();

v1Router.use('/health', healthRouter);
