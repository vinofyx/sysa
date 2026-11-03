import { Router, type Request, type Response } from 'express';

import { env, envLoadInfo } from '@config/env';
import { describeDatabaseUrl, diagnoseDbError, type DbErrorCategory } from '@lib/db-diagnostics';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

export const healthRouter = Router();

/** Health probes run often; log a failure when its kind changes, or at most
 * once a minute while it persists. */
const REPEAT_LOG_MS = 60_000;
let lastLogged: { key: string; at: number } | null = null;

/**
 * Shared handler for both health routes (see below).
 *
 * Performs a live `SELECT 1` against the database and returns a JSON body
 * with `status`, `timestamp`, `uptimeSeconds`, `responseTimeMs`, `checks`,
 * and `version`. HTTP 200 when the database answers; 503 when it does not.
 * Only a fixed error category is ever returned publicly — never the error message,
 * host, username, or connection string.
 *
 * Protected diagnostic mode: when called with an `x-diagnostic-key` header
 * or `diagnosticKey` query parameter matching `JWT_ACCESS_SECRET`, safe
 * non-secret connection targets (host, port, database, source) are returned
 * to assist operators in diagnosing hosting configuration without logging secrets.
 */
async function healthHandler(req: Request, res: Response): Promise<void> {
  const startedAt = Date.now();
  let databaseStatus: 'ok' | 'error' = 'ok';
  let databaseError: DbErrorCategory | undefined;
  let lastDiagnosisCode: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    databaseStatus = 'error';
    const diagnosis = diagnoseDbError(error);
    databaseError = diagnosis.category;
    lastDiagnosisCode = diagnosis.code;
    const key = `${diagnosis.code}:${diagnosis.category}`;
    const now = Date.now();
    if (!lastLogged || lastLogged.key !== key || now - lastLogged.at >= REPEAT_LOG_MS) {
      lastLogged = { key, at: now };
      logger.error('Health check: database unavailable', { ...diagnosis });
    }
  }

  const body: Record<string, unknown> = {
    status: databaseStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    responseTimeMs: Date.now() - startedAt,
    checks: {
      database: databaseStatus,
      ...(databaseError ? { databaseError } : {}),
    },
    version: process.env.npm_package_version ?? '0.1.0',
  };

  // Protected diagnostic verification: accessible only with dedicated DIAGNOSTIC_API_KEY
  // (or JWT_ACCESS_SECRET fallback in test isolation) provided strictly in x-diagnostic-key header.
  // Never accepted via URL query parameters to prevent leakage in web server access logs.
  const authHeader = req.headers?.['x-diagnostic-key'] as string | undefined;
  const diagnosticCredential = env.DIAGNOSTIC_API_KEY ?? env.JWT_ACCESS_SECRET;
  const isAuthorizedDiagnostic =
    typeof diagnosticCredential === 'string' &&
    diagnosticCredential.length >= 16 &&
    typeof authHeader === 'string' &&
    authHeader === diagnosticCredential;

  if (isAuthorizedDiagnostic) {
    const connection = describeDatabaseUrl(process.env.DATABASE_URL);
    let schemaStatus = null;
    try {
      const { checkSchemaColumns } = await import('@lib/db-startup-check');
      schemaStatus = await checkSchemaColumns();
    } catch {
      schemaStatus = null;
    }

    body.diagnostics = {
      configuredHost: connection.host,
      configuredPort: connection.port,
      configuredDatabase: connection.database,
      databaseUrlSource: envLoadInfo.databaseUrlFromHost
        ? 'host environment'
        : connection.present
          ? `env file (${envLoadInfo.envFilesLoaded.join(', ') || 'none found in cwd'})`
          : 'missing',
      hasUsername: connection.hasUsername,
      hasPassword: connection.hasPassword,
      passwordLength: connection.passwordLength,
      passwordPercentEncoded: connection.passwordPercentEncoded,
      wrappedInQuotes: connection.wrappedInQuotes,
      errorCode: lastDiagnosisCode,
      errorCategory: databaseError ?? null,
      razorpayConfigured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
      razorpayKeyType: env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')
        ? 'live'
        : env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')
          ? 'test'
          : 'unset',
      schemaStatus,
    };
  }

  res.status(databaseStatus === 'ok' ? 200 : 503).json(body);
}

/**
 * GET /api/v1/health
 *
 * Canonical liveness/readiness probe used by uptime monitoring, load
 * balancers, and CI smoke tests (see design/15-Deployment-Architecture.md
 * §8 and §4 "SmokeTest" pipeline step).
 */
healthRouter.get('/', healthHandler);

/**
 * GET /api/v1/health/check
 *
 * Alias for GET /api/v1/health — resolves NOT_FOUND that external monitors
 * and integration consumers receive when calling the `/check` sub-path.
 * Both paths share the identical handler; the canonical path remains `/`.
 */
healthRouter.get('/check', healthHandler);
