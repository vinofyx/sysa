import { env, envLoadInfo } from '@config/env';
import { describeDatabaseUrl, diagnoseDbError } from '@lib/db-diagnostics';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

/**
 * One database check at startup, logged server-side only (never exposed by
 * the public health endpoint). On failure it records what is needed to tell
 * a wrong host/database/credential/config source apart — the Prisma error
 * code and category, where DATABASE_URL came from, and the parsed host, port
 * and database — without the username, password or URL.
 */
export async function logDatabaseStartupCheck(): Promise<void> {
  const connection = describeDatabaseUrl(process.env.DATABASE_URL);
  const context = {
    nodeEnv: env.NODE_ENV,
    hostNodeEnv: envLoadInfo.hostNodeEnv,
    cwd: envLoadInfo.cwd,
    databaseUrlSource: envLoadInfo.databaseUrlFromHost
      ? 'host environment'
      : connection.present
        ? `env file (${envLoadInfo.envFilesLoaded.join(', ') || 'none found in cwd'})`
        : 'missing',
    envFilesInCwd: envLoadInfo.envFilesInCwd,
    connection,
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database startup check: connected', context);
  } catch (error) {
    logger.error('Database startup check: FAILED', { ...context, ...diagnoseDbError(error) });
  }
}
