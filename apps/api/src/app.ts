import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { env } from '@config/env';
import { openApiDocument } from '@config/swagger';
import { errorHandler } from '@middleware/error-handler.middleware';
import { notFoundHandler } from '@middleware/not-found.middleware';
import { requestLogger } from '@middleware/request-logger.middleware';
import { v1Router } from '@routes/v1';

/**
 * Express application factory — separated from server.ts so the app can be imported
 * directly in integration tests without binding a live port.
 */
export function createApp(): Application {
  const app = express();

  // Security headers (SEC baseline — documentation/12-Security-Requirements.md §7)
  app.use(helmet());

  // CORS — restricted to the configured web origin, not a wildcard
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // General-purpose rate limiting (SEC-INFRA-04); stricter per-route limits are applied
  // to sensitive endpoints (auth, donations, contact) when those routes are implemented.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // API versioning root — see design/13-API-Architecture.md §6
  app.use('/api/v1', v1Router);

  // Swagger/OpenAPI documentation — not indexed, not linked from the public site.
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/v1/docs.json', (_req, res) => res.json(openApiDocument));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
