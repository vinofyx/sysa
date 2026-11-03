import { env, envLoadInfo } from '@config/env';
import { describeDatabaseUrl, diagnoseDbError } from '@lib/db-diagnostics';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

export interface SchemaHealthStatus {
  donationContacts: boolean;
  donorWhatsappConsent: boolean;
  receiptRetry: boolean;
}

/**
 * Checks whether the recent migration columns exist on live database tables.
 */
export async function checkSchemaColumns(): Promise<SchemaHealthStatus> {
  const status: SchemaHealthStatus = {
    donationContacts: false,
    donorWhatsappConsent: false,
    receiptRetry: false,
  };

  try {
    const donationCols = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(
      "SHOW COLUMNS FROM `donation` LIKE 'receipt_email'",
    );
    status.donationContacts = Array.isArray(donationCols) && donationCols.length > 0;
  } catch {
    status.donationContacts = false;
  }

  try {
    const donorCols = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(
      "SHOW COLUMNS FROM `donor` LIKE 'whatsapp_receipt_consent'",
    );
    status.donorWhatsappConsent = Array.isArray(donorCols) && donorCols.length > 0;
  } catch {
    status.donorWhatsappConsent = false;
  }

  try {
    const receiptCols = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(
      "SHOW COLUMNS FROM `receipt` LIKE 'delivery_retry_count'",
    );
    status.receiptRetry = Array.isArray(receiptCols) && receiptCols.length > 0;
  } catch {
    status.receiptRetry = false;
  }

  return status;
}

/**
 * One database check at startup, logged server-side only (never exposed by
 * the public health endpoint). On failure it records what is needed to tell
 * a wrong host/database/credential/config source apart — the Prisma error
 * code and category, where DATABASE_URL came from, and the parsed host, port
 * and database — without the username, password or URL.
 *
 * Adheres to safety requirement: connectivity and schema compatibility are
 * checked and diagnosed separately, and NO automatic unreviewed ALTER TABLE
 * or background migrations are executed at application startup.
 */
export async function logDatabaseStartupCheck(): Promise<void> {
  const connection = describeDatabaseUrl(process.env.DATABASE_URL);
  const source = envLoadInfo.databaseUrlFromHost
    ? 'host environment'
    : connection.present
      ? `env file (${envLoadInfo.envFilesLoaded.join(', ') || 'none found in cwd'})`
      : 'missing';

  const context = {
    nodeEnv: env.NODE_ENV,
    hostNodeEnv: envLoadInfo.hostNodeEnv,
    cwd: envLoadInfo.cwd,
    databaseUrlSource: source,
    envFilesInCwd: envLoadInfo.envFilesInCwd,
    connection,
  };

  // Direct console logging ensures output is captured by Hostinger/Passenger runtime logs
  console.info(
    `[DB-CONFIG] Host: ${connection.host ?? 'unset'}, Port: ${connection.port ?? '3306'}, Database: ${connection.database ?? 'unset'}, Source: ${source}, UsernameSet: ${connection.hasUsername}, PasswordSet: ${connection.hasPassword} (len: ${connection.passwordLength}), Quotes: ${connection.wrappedInQuotes}`,
  );

  try {
    // 1. Separate connectivity check
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database startup check: connected', context);
    console.info('[DB-STARTUP] Database connection verified successfully.');

    // 2. Separate schema compatibility check (read-only diagnostic, never modifies schema)
    if (process.env.NODE_ENV !== 'test') {
      const schema = await checkSchemaColumns();
      if (!schema.donationContacts || !schema.donorWhatsappConsent || !schema.receiptRetry) {
        console.warn(
          `[DB-SCHEMA-WARNING] Pending migrations detected on database: donationContacts=${schema.donationContacts}, donorWhatsappConsent=${schema.donorWhatsappConsent}, receiptRetry=${schema.receiptRetry}. Run 'npx prisma migrate deploy' as an explicit post-backup deployment step.`,
        );
      } else {
        console.info('[DB-SCHEMA] Database schema compatibility verified successfully.');
      }
    }
  } catch (error) {
    const diag = diagnoseDbError(error);
    logger.error('Database startup check: FAILED', { ...context, ...diag });
    console.error(
      `[DB-STARTUP-FAIL] Code: ${diag.code ?? 'none'}, Category: ${diag.category}, ErrorName: ${diag.errorName}, Host: ${connection.host ?? 'unset'}, Database: ${connection.database ?? 'unset'}`,
    );
  }
}
