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

  // Trust the first hop reverse proxy (Nginx per design/15-Deployment-Architecture.md)
  // so `req.ip` reflects the real client IP rather than the proxy's — without
  // this, express-rate-limit buckets every request from behind the proxy
  // together, letting one client's traffic exhaust the shared limit for
  // everyone else. Harmless in local dev (no proxy in front).
  app.set('trust proxy', 1);

  // Security headers (SEC baseline — documentation/12-Security-Requirements.md §7).
  // Default helmet CORP is `same-origin`, which stops the browser from reading
  // API responses when the website is a different origin (localhost:3030 vs
  // :5050, or Hostinger vs a separate Node host). CORS below still restricts
  // which origins may call us — this is not a wildcard.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS — restricted to the configured web origin(s), not a wildcard.
  // `credentials: true` is required since auth uses httpOnly cookies
  // (api-client.ts's `withCredentials: true`) — a wildcard origin is
  // rejected by browsers when credentials are involved, so this must stay
  // an explicit allow-list. `env.CORS_ORIGIN` is already a string[]
  // (see config/env.ts) — the `cors` package matches an incoming request's
  // Origin header against every entry natively.
  //
  // In development only, any loopback origin (localhost / 127.0.0.1 / [::1]
  // on any port) is also allowed: the same local site is routinely opened
  // as 127.0.0.1:3030, on an auto-assigned preview port, or via the :5060
  // static preview, and each of those was rejected by the exact-match list —
  // the browser then surfaces it only as a network error ("Unable to
  // connect") on Pay Now. Production keeps the exact allow-list.
  const loopbackOrigin = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
  app.use(
    cors({
      origin:
        env.NODE_ENV === 'development'
          ? (origin, callback) => {
              callback(
                null,
                !origin || env.CORS_ORIGIN.includes(origin) || loopbackOrigin.test(origin),
              );
            }
          : env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // General-purpose rate limiting (SEC-INFRA-04); stricter per-route limits are applied
  // to sensitive endpoints (auth, donations, contact) when those routes are implemented.
  // Raised well above the production limit in development only — a single
  // page load triggers 5-8 parallel calls (settings, nav, socials, hero
  // banners, testimonials, activities, ...) and Next's dev-mode re-renders
  // multiply that further, so the production-sized limit trips constantly
  // during ordinary local testing even from one browser tab. Production
  // (env.NODE_ENV === 'production') keeps the exact original limit.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: env.NODE_ENV === 'development' ? 10_000 : 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(compression());
  // `verify` captures the raw request bytes onto `req.rawBody` alongside the
  // normal JSON parse — the Razorpay webhook handler needs the exact raw
  // bytes to compute its HMAC signature (re-serializing req.body would not
  // byte-for-byte match what Razorpay signed). Every other route is
  // unaffected and keeps using the parsed `req.body` as before.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // API versioning root — see design/13-API-Architecture.md §6
  app.use('/api/v1', v1Router);

  // Swagger/OpenAPI documentation — not indexed, not linked from the public site.
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/v1/docs.json', (_req, res) => res.json(openApiDocument));

  // Bare root — this is an API-only server (the public site is the separate
  // Next.js app, reverse-proxied in front of both at :5050 in local dev, see
  // scripts/local-proxy.mjs). Visiting :4000/ directly used to fall straight
  // through to notFoundHandler; this just gives that direct hit a clean
  // status response instead of a 404, purely cosmetic — every real route
  // still lives under /api/v1.
  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Sai Yadadri Seva Ashram API',
      message: 'API server is running successfully',
      port: env.PORT,
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
