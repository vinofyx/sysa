import { createApp } from './app';
import { env } from '@config/env';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, env.BIND_HOST, () => {
  logger.info(
    `🚀 Sai Yadadri Seva Ashram API listening on ${env.BIND_HOST}:${env.PORT} [${env.NODE_ENV}]`,
  );
  logger.info(`   Health check: ${env.API_URL}/api/v1/health`);
});

/**
 * Graceful shutdown — closes the HTTP server and database connection cleanly on
 * termination signals, so in-flight requests (including donation webhooks) are not
 * abruptly dropped. Relevant to the deployment rolling-restart strategy in
 * design/15-Deployment-Architecture.md §4.
 */
function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);

  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });

  // Force-exit if graceful shutdown hangs beyond 10 seconds.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
