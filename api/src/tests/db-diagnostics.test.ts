import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { afterEach, describe, it, mock } from 'node:test';

import { Prisma } from '@prisma/client';
import winston from 'winston';

import { diagnoseDbError } from '@lib/db-diagnostics';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { healthRouter } from '@/routes/v1/health.routes';
import { redactSecrets } from '@utils/redact-secrets';

const SECRET_URL = 'mysql://sysa_user:S3cretPass@db.example.test:3306/sysa_db';

function initError(message: string, code?: string) {
  return new Prisma.PrismaClientInitializationError(message, '5.22.0', code);
}

/** Runs GET /api/v1/health's handler directly (no network). */
async function callHealth(): Promise<{ status: number; body: Record<string, any> }> {
  const layer = (healthRouter as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/',
  );
  const handler = layer.route.stack[0].handle;
  return new Promise((resolve) => {
    let status = 200;
    const res = {
      status(code: number) {
        status = code;
        return res;
      },
      json(body: Record<string, any>) {
        resolve({ status, body });
        return res;
      },
    };
    void handler({}, res, () => undefined);
  });
}

describe('database error diagnostics', () => {
  it('maps Prisma connection error codes to fixed categories', () => {
    const cases: Array<[string, string]> = [
      ['P1000', 'auth_failed'],
      ['P1001', 'unreachable'],
      ['P1003', 'database_missing'],
      ['P1010', 'access_denied'],
      ['P1011', 'tls_error'],
      ['P1013', 'invalid_url'],
      ['P1017', 'connection_closed'],
    ];
    for (const [code, category] of cases) {
      const diagnosis = diagnoseDbError(initError('details', code));
      assert.deepEqual(diagnosis, { code, category, errorName: 'PrismaClientInitializationError' });
    }
  });

  it('maps a missing table (migrations not applied) to schema_missing', () => {
    const error = new Prisma.PrismaClientKnownRequestError('The table `receipt` does not exist', {
      code: 'P2021',
      clientVersion: '5.22.0',
    });
    assert.equal(diagnoseDbError(error).category, 'schema_missing');
  });

  it('falls back to the message only to pick a category, never to return it', () => {
    const diagnosis = diagnoseDbError(
      new Error(`Authentication failed against database server, URL ${SECRET_URL}`),
    );
    assert.equal(diagnosis.code, null);
    assert.equal(diagnosis.category, 'auth_failed');
    assert.ok(!JSON.stringify(diagnosis).includes('S3cretPass'));
    assert.equal(diagnoseDbError('weird').category, 'unknown');
  });
});

describe('GET /api/v1/health database failure reporting', () => {
  afterEach(() => mock.restoreAll());

  it('reports ok with no error field when the database answers', async () => {
    mock.method(prisma, '$queryRaw', async () => [{ 1: 1 }]);
    const { status, body } = await callHealth();
    assert.equal(status, 200);
    assert.deepEqual(body.checks, { database: 'ok' });
  });

  it('returns 503 with only the category, and logs only code/category/name', async () => {
    const message = `Authentication failed against database server at db.example.test, the provided database credentials for sysa_user are not valid. ${SECRET_URL}`;
    mock.method(prisma, '$queryRaw', async () => {
      throw initError(message, 'P1000');
    });
    const logged: unknown[] = [];
    mock.method(logger, 'error', (...args: unknown[]) => {
      logged.push(args);
      return logger;
    });

    const { status, body } = await callHealth();
    assert.equal(status, 503);
    assert.equal(body.status, 'degraded');
    assert.deepEqual(body.checks, { database: 'error', databaseError: 'auth_failed' });

    assert.equal(logged.length, 1);
    assert.deepEqual(logged[0], [
      'Health check: database unavailable',
      { code: 'P1000', category: 'auth_failed', errorName: 'PrismaClientInitializationError' },
    ]);
    const everything = JSON.stringify([body, logged]);
    for (const leaked of ['S3cretPass', 'sysa_user', 'db.example.test', 'mysql://']) {
      assert.ok(!everything.includes(leaked), `leaked ${leaked}`);
    }
  });
});

describe('central log redaction of database errors', () => {
  const prismaMessage =
    "\nInvalid `prisma.donor.create()` invocation:\n\n{ data: { fullName: 'Ravi Kumar', phone: '9876543210' } }\n\nCan't reach database server at `db.example.test:3306`";

  it('replaces any Prisma error text with a fixed category', () => {
    assert.equal(redactSecrets(prismaMessage), '[database error: unreachable]');
    assert.equal(
      redactSecrets('Authentication failed against database server at `db.example.test`'),
      '[database error: auth_failed]',
    );
  });

  it('strips credentials from any connection string', () => {
    const out = redactSecrets(`connecting to ${SECRET_URL}`);
    assert.ok(!out.includes('S3cretPass') && !out.includes('sysa_user'));
    assert.ok(out.includes('mysql://[REDACTED]@db.example.test'));
  });

  it('every logger.error path (message, meta, Error objects, stacks) is scrubbed', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, done) {
        lines.push(String(chunk));
        done();
      },
    });
    const transport = new winston.transports.Stream({ stream, format: winston.format.json() });
    logger.add(transport);
    try {
      const error = new Prisma.PrismaClientKnownRequestError(prismaMessage, {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
      // The shapes used by error-handler.middleware.ts, server.ts and services.
      logger.error(error.message, { stack: error.stack, path: '/api/v1/donations/initiate' });
      logger.error('Unhandled error', { error: error.message, stack: error.stack });
      logger.error('Unhandled Promise Rejection', { reason: error });
      logger.error('Receipt issuance failed', { error: `${error.message} ${SECRET_URL}` });
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      logger.remove(transport);
    }
    const output = lines.join('\n');
    assert.equal(lines.length, 4);
    for (const leaked of [
      'Ravi Kumar',
      '9876543210',
      'db.example.test',
      'S3cretPass',
      'sysa_user',
      'prisma.donor',
    ]) {
      assert.ok(!output.includes(leaked), `log leaked ${leaked}`);
    }
    assert.ok(output.includes('[database error:'));
  });
});
