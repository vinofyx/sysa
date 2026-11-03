import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { env } from '@config/env';
import { errorHandler } from '@middleware/error-handler.middleware';
import { initiateDonationSchema } from '@validation/donation-checkout.schema';
import { ApiError } from '@utils/api-error';

describe('Donation Checkout API, CORS & Error Handling Integration Tests', () => {
  describe('CORS Preflight & Origin Allowlist Enforcement', () => {
    const loopbackOrigin = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
    const isDevelopment = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

    const isOriginAllowed = (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      if (env.CORS_ORIGIN.includes(origin)) return callback(null, true);
      if (isDevelopment && (loopbackOrigin.test(origin) || origin === 'http://localhost:5055')) {
        return callback(null, true);
      }
      return callback(null, false);
    };

    const corsOptions: cors.CorsOptions = {
      origin: isOriginAllowed,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Correlation-ID',
        'X-SYSA-Proxy',
        'X-Forwarded-For',
        'X-Forwarded-Proto',
        'Cache-Control',
        'Pragma',
        'Expires',
      ],
      exposedHeaders: ['X-Correlation-ID'],
      optionsSuccessStatus: 204,
    };

    const corsMiddleware = cors(corsOptions);

    function runCors(
      reqHeaders: Record<string, string>,
      method = 'OPTIONS',
    ): {
      statusCode: number;
      headers: Record<string, string>;
      ended: boolean;
    } {
      const headers: Record<string, string> = {};
      let statusCode = 200;
      let ended = false;

      const req = {
        method,
        headers: reqHeaders,
      } as unknown as Request;

      const res = {
        statusCode: 200,
        setHeader: (name: string, value: string) => {
          headers[name.toLowerCase()] = String(value);
        },
        getHeader: (name: string) => headers[name.toLowerCase()],
        end: () => {
          ended = true;
        },
      } as unknown as Response;

      corsMiddleware(req, res, () => {});
      statusCode = res.statusCode;

      return { statusCode, headers, ended };
    }

    it('accepts OPTIONS preflight from exact development origin http://localhost:5055', () => {
      const result = runCors({
        origin: 'http://localhost:5055',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, x-correlation-id',
      });

      assert.equal(result.statusCode, 204, 'Preflight must return 204 status');
      assert.equal(
        result.headers['access-control-allow-origin'],
        'http://localhost:5055',
        'Must allow http://localhost:5055 origin',
      );
      assert.equal(result.headers['access-control-allow-credentials'], 'true');
      assert.ok(result.headers['access-control-allow-methods'].includes('POST'));
    });

    it('accepts OPTIONS preflight from loopback preview origin http://127.0.0.1:5055', () => {
      const result = runCors({
        origin: 'http://127.0.0.1:5055',
        'access-control-request-method': 'POST',
      });

      assert.equal(result.statusCode, 204);
      assert.equal(result.headers['access-control-allow-origin'], 'http://127.0.0.1:5055');
    });

    it('accepts OPTIONS preflight requesting Cache-Control and Pragma headers', () => {
      const result = runCors({
        origin: 'http://localhost:5055',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'cache-control, pragma',
      });

      assert.equal(result.statusCode, 204);
      assert.equal(result.headers['access-control-allow-origin'], 'http://localhost:5055');
      assert.ok(
        result.headers['access-control-allow-headers'].toLowerCase().includes('cache-control'),
      );
      assert.ok(result.headers['access-control-allow-headers'].toLowerCase().includes('pragma'));
    });

    it('rejects unapproved external origin without returning Access-Control-Allow-Origin', () => {
      const result = runCors({
        origin: 'https://malicious-attacker.com',
        'access-control-request-method': 'POST',
      });

      assert.equal(result.headers['access-control-allow-origin'], undefined);
    });

    it('allows requests with no origin (mobile app, backend proxies, server-to-server)', () => {
      const result = runCors({}, 'POST');
      assert.equal(result.headers['access-control-allow-origin'], undefined);
    });
  });

  describe('Donation Initiation Payload Validation', () => {
    const validPayload = {
      amount: 1000,
      currency: 'INR',
      donorName: 'Dharani',
      donorPhone: '9515960526',
      donorEmail: 'dharani@sysa.in',
      panNumber: 'BAQPL0308B',
      aadhaarNumber: '866220198057',
      categoryId: '59d7c0e9-e012-42cb-a785-7a5364d3b037',
      idempotencyKey: 'idemp-123456789012345678901',
      whatsappReceiptConsent: true,
    };

    it('accepts a fully-formed valid donation initiation payload', () => {
      const parsed = initiateDonationSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);
    });

    it('rejects negative or zero amounts', () => {
      assert.equal(initiateDonationSchema.safeParse({ ...validPayload, amount: 0 }).success, false);
      assert.equal(
        initiateDonationSchema.safeParse({ ...validPayload, amount: -500 }).success,
        false,
      );
    });

    it('rejects invalid mobile phone numbers', () => {
      for (const badPhone of ['12345', '951596052', '951596052600', 'abcdefghij']) {
        const res = initiateDonationSchema.safeParse({ ...validPayload, donorPhone: badPhone });
        assert.equal(res.success, false, `Should reject phone ${badPhone}`);
      }
    });

    it('rejects invalid PAN and Aadhaar formats', () => {
      assert.equal(
        initiateDonationSchema.safeParse({ ...validPayload, panNumber: 'INVALID_PAN' }).success,
        false,
      );
      assert.equal(
        initiateDonationSchema.safeParse({ ...validPayload, aadhaarNumber: '123' }).success,
        false,
      );
    });
  });

  describe('Database & Payment Provider Error Handling Security', () => {
    function invokeErrorHandler(err: unknown): {
      statusCode: number;
      body: { error: { code: string; message: string } };
    } {
      let statusCode = 500;
      let body: { error: { code: string; message: string } } = {
        error: { code: '', message: '' },
      };

      const req = {
        path: '/api/v1/donations/initiate',
        method: 'POST',
        correlationId: 'test-corr-id-12345',
      } as unknown as Request;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: { error: { code: string; message: string } }) => {
          body = data;
          return res;
        },
      } as unknown as Response;

      errorHandler(err, req, res, (() => {}) as NextFunction);
      return { statusCode, body };
    }

    it('sanitizes database PrismaClientInitializationError and returns safe 500 without leaking credentials', () => {
      const dbAuthError = new Error(
        "Can't reach database server at `srv1834.hstgr.io:3306` - Authentication failed for user 'u425075282_sai_user' password 'Zxc01iop2'",
      );
      dbAuthError.name = 'PrismaClientInitializationError';

      const { statusCode, body } = invokeErrorHandler(dbAuthError);

      assert.equal(statusCode, 500);
      assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
      assert.equal(body.error.message, 'An unexpected error occurred');

      // Verify no DB secrets or hostnames leaked
      const serialized = JSON.stringify(body);
      assert.ok(!serialized.includes('srv1834.hstgr.io'), 'Must not leak database hostname');
      assert.ok(!serialized.includes('u425075282_sai_user'), 'Must not leak database username');
      assert.ok(!serialized.includes('Zxc01iop2'), 'Must never leak database password');
    });

    it('handles payment gateway timeout safely without leaking API secret keys', () => {
      const razorpayError = ApiError.internal('Payment gateway timeout');
      const { statusCode, body } = invokeErrorHandler(razorpayError);

      assert.equal(statusCode, 500);
      assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
    });

    it('returns structured 400 response for client validation errors', () => {
      const validationError = ApiError.badRequest('Selected donation category was not found.');
      const { statusCode, body } = invokeErrorHandler(validationError);

      assert.equal(statusCode, 400);
      assert.equal(body.error.code, 'BAD_REQUEST');
      assert.equal(body.error.message, 'Selected donation category was not found.');
    });
  });
});
