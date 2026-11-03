/**
 * Safe Database Connection Verification Utility
 *
 * Performs a credential-free diagnostic probe against the configured database
 * via Prisma ($queryRaw `SELECT 1`).
 *
 * Rules:
 * - NEVER prints or logs passwords, tokens, or raw connection strings.
 * - Reports configured host, port, database name, and configuration source.
 * - Classifies errors into fixed categories (auth_failed, unreachable, etc.)
 *
 * Usage:
 *   npx tsx scripts/verify-db-connection.ts
 */
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadEnvFiles } from '../src/config/env';
import { describeDatabaseUrl, diagnoseDbError } from '../src/lib/db-diagnostics';

// Load configuration using the exact same logic as the production application
const apiRoot = path.resolve(__dirname, '..');
const loadedFiles = loadEnvFiles(process.env, apiRoot);
const databaseUrlFromHost = Boolean(process.env.DATABASE_URL && !loadedFiles.length);

function extractSafeTarget(raw: string | undefined): {
  username: string | null;
  passwordHasReservedChars: boolean;
  passwordPercentEncoded: boolean;
} {
  const value = (raw ?? '').trim().replace(/^["']|["']$/g, '');
  const rawCreds = /^[a-z][a-z0-9+.-]*:\/\/([^/]*)@[^@/]*(?:[/?#]|$)/i.exec(value)?.[1] ?? '';
  const colon = rawCreds.indexOf(':');
  const rawUser = colon >= 0 ? rawCreds.slice(0, colon) : rawCreds;
  const rawPass = colon >= 0 ? rawCreds.slice(colon + 1) : '';
  let user: string | null = null;
  try {
    user = rawUser ? decodeURIComponent(rawUser) : null;
  } catch {
    user = rawUser || null;
  }
  return {
    username: user,
    passwordHasReservedChars: /[@:/?#[\]\s]/.test(rawPass),
    passwordPercentEncoded: /%[0-9a-f]{2}/i.test(rawPass),
  };
}

export async function verifyDatabaseConnection(): Promise<{
  ok: boolean;
  host: string | null;
  port: string | null;
  database: string | null;
  username: string | null;
  code: string | null;
  category: string;
}> {
  const rawUrl = process.env.DATABASE_URL;
  const connection = describeDatabaseUrl(rawUrl);
  const safeTarget = extractSafeTarget(rawUrl);

  const sourceDesc = databaseUrlFromHost
    ? 'Host Environment Variables (hPanel / system)'
    : loadedFiles.length
      ? `Loaded env file (${loadedFiles.join(', ')})`
      : 'Default / fallback';

  console.log('=== SYSA Database Connection Diagnostics ===');
  console.log(`Config Source:       ${sourceDesc}`);
  console.log(`Configured Host:     ${connection.host ?? '(not configured)'}`);
  console.log(`Configured Port:     ${connection.port ?? '3306'}`);
  console.log(`Configured Database: ${connection.database ?? '(not configured)'}`);
  console.log(`Configured Username: ${safeTarget.username ?? '(not configured)'}`);
  console.log(
    `Password Set:        ${connection.hasPassword ? `Yes (${connection.passwordLength} chars, percent-encoded: ${safeTarget.passwordPercentEncoded ? 'Yes' : 'No'}, unencoded reserved chars: ${safeTarget.passwordHasReservedChars ? 'YES - WARNING' : 'No'})` : 'No'}`,
  );
  console.log(
    `Wrapped in Quotes:   ${connection.wrappedInQuotes ? 'WARNING: URL is wrapped in quotes!' : 'No'}`,
  );
  console.log('--------------------------------------------');

  if (!connection.present || !connection.parseable) {
    console.error('ERROR: DATABASE_URL is missing or cannot be parsed.');
    return {
      ok: false,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: safeTarget.username,
      code: null,
      category: 'invalid_url',
    };
  }

  const prisma = new PrismaClient();
  try {
    console.log('Attempting live SELECT 1 probe...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('RESULT: SUCCESS - Database is reachable and authenticated successfully.');
    return {
      ok: true,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: safeTarget.username,
      code: null,
      category: 'ok',
    };
  } catch (error) {
    const diag = diagnoseDbError(error);
    console.error(`RESULT: FAILED`);
    console.error(`Prisma Code:     ${diag.code ?? '(none)'}`);
    console.error(`Error Category:  ${diag.category}`);
    console.error(`Error Name:      ${diag.errorName}`);
    if (error instanceof Error) {
      const masked = error.message.replace(/:[^:@/]+@/g, ':***@');
      console.error(`Raw Message:     ${masked}`);
    }
    return {
      ok: false,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: safeTarget.username,
      code: diag.code,
      category: diag.category,
    };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void verifyDatabaseConnection().then((result) => {
    process.exit(result.ok ? 0 : 1);
  });
}
