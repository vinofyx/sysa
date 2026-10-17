/**
 * Safe classification of Prisma/MySQL failures for logs and the health check.
 * Only a provider error code (e.g. P1001) and a fixed category ever leave
 * this module — never the error message, which can carry the database host,
 * user name, query text or query parameters (donor data).
 */
export type DbErrorCategory =
  | 'auth_failed'
  | 'unreachable'
  | 'timeout'
  | 'database_missing'
  | 'access_denied'
  | 'tls_error'
  | 'invalid_url'
  | 'connection_closed'
  | 'too_many_connections'
  | 'schema_missing'
  | 'unknown';

export interface DbErrorDiagnosis {
  /** Prisma error code (P1xxx/P2xxx) when present, else null. */
  code: string | null;
  category: DbErrorCategory;
  /** Error class name, e.g. PrismaClientInitializationError. */
  errorName: string;
}

const CODE_CATEGORIES: Record<string, DbErrorCategory> = {
  P1000: 'auth_failed',
  P1001: 'unreachable',
  P1002: 'timeout',
  P1003: 'database_missing',
  P1008: 'timeout',
  P1010: 'access_denied',
  P1011: 'tls_error',
  P1013: 'invalid_url',
  P1017: 'connection_closed',
  P2021: 'schema_missing',
  P2022: 'schema_missing',
  P2024: 'timeout',
};

/** Message patterns, matched only to pick a category (the text is discarded). */
const MESSAGE_CATEGORIES: Array<[RegExp, DbErrorCategory]> = [
  [/authentication failed|access denied for user/i, 'auth_failed'],
  [/can't reach database server|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH/i, 'unreachable'],
  [/timed out|ETIMEDOUT/i, 'timeout'],
  [/database .* does not exist|unknown database/i, 'database_missing'],
  [/too many connections/i, 'too_many_connections'],
  [/tls|ssl|certificate/i, 'tls_error'],
  [/server has closed the connection|connection reset|ECONNRESET/i, 'connection_closed'],
  [/the table .* does not exist|the column .* does not exist/i, 'schema_missing'],
  [/invalid .*url|the provided database string is invalid/i, 'invalid_url'],
];

const PRISMA_CODE = /^P\d{4}$/;

export function categorizeDbMessage(message: string): DbErrorCategory {
  for (const [pattern, category] of MESSAGE_CATEGORIES) {
    if (pattern.test(message)) return category;
  }
  return 'unknown';
}

export function diagnoseDbError(error: unknown): DbErrorDiagnosis {
  const errorName = error instanceof Error ? error.name : typeof error;
  const record = (error && typeof error === 'object' ? error : {}) as Record<string, unknown>;
  const rawCode = [record.errorCode, record.code].find(
    (value): value is string => typeof value === 'string' && PRISMA_CODE.test(value),
  );
  const code = rawCode ?? null;
  const category =
    (code && CODE_CATEGORIES[code]) ||
    categorizeDbMessage(error instanceof Error ? error.message : String(record.message ?? ''));
  return { code, category, errorName };
}
