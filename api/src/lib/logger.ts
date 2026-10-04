import path from 'node:path';
import winston from 'winston';

import { env } from '@config/env';
import { redactDeep, redactSecrets } from '@utils/redact-secrets';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/** Runs before every transport: scrubs configured credential values from the
 * message and all metadata, so no code path can log a secret by accident. */
const redact = winston.format((info) => {
  for (const key of Object.keys(info)) {
    const record = info as Record<string, unknown>;
    record[key] =
      key === 'message' && typeof record[key] === 'string'
        ? redactSecrets(record[key] as string)
        : redactDeep(record[key]);
  }
  return info;
});

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${String(ts)} [${level}]: ${String(stack ?? message)}${metaStr}`;
  }),
);

const fileFormat = combine(timestamp(), errors({ stack: true }), json());

const logsDir = path.join(__dirname, '..', '..', 'logs');

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: redact(),
  defaultMeta: { service: 'sysa-api' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

// In production, avoid noisy debug-level console spam but keep file logs complete.
if (env.NODE_ENV === 'production') {
  logger.transports.forEach((transport) => {
    if (transport instanceof winston.transports.Console) {
      transport.level = 'info';
    }
  });
}
