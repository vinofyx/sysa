import { networkGuard } from './setup-env';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';

import { env, parseEnv } from '@config/env';
import {
  parseTemplateVarMap,
  sendWhatsAppReceipt,
  toWhatsAppMobile,
} from '@integrations/whatsapp/whatsapp.service';
import { isValidIndianMobile } from '@utils/mobile';

/** Each test here deliberately trips the guard; clear its record so the
 * process-exit check only fails on UNEXPECTED network attempts. */
afterEach(() => {
  networkGuard?.attempts.splice(0);
});

describe('Test network isolation', () => {
  it('is preloaded for every test process by npm test, independent of NODE_ENV', () => {
    assert.ok(networkGuard, 'network guard not installed');
    assert.ok(
      process.execArgv.some((arg) => arg.includes('setup-env')),
      'setup-env.ts must be preloaded via --import (see package.json "test")',
    );
    assert.equal(process.env.SYSA_TEST_ISOLATION, '1');
  });

  it('never loads api/.env or api/.env.local credentials', () => {
    for (const key of [
      'MSG91_AUTHKEY',
      'MSG91_WHATSAPP_AUTHKEY',
      'SMS_PROVIDER_API_KEY',
      'SMTP_PASSWORD',
      'SMTP_HOST',
      'RAZORPAY_KEY_ID',
      'CLOUDINARY_API_SECRET',
    ] as const) {
      assert.equal(env[key], undefined, `${key} leaked into the test environment`);
    }
  });

  it('blocks fetch to MSG91', async () => {
    await assert.rejects(
      () => fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/'),
      /blocked in tests/,
    );
    assert.equal(networkGuard?.attempts.length, 1);
  });

  it('blocks raw https (the Razorpay SDK transport)', async () => {
    const error = await new Promise<Error>((resolve) => {
      https.get('https://api.razorpay.com/v1/payments/pay_x', () => undefined).on('error', resolve);
    });
    assert.match(error.message, /blocked in tests/);
  });

  it('blocks the Razorpay SDK', async () => {
    const client = new Razorpay({ key_id: 'rzp_test_blocked', key_secret: 'blocked' });
    await assert.rejects(() => client.payments.fetch('pay_blocked'));
    assert.ok((networkGuard?.attempts.length ?? 0) > 0);
  });

  it('blocks SMTP (nodemailer)', async () => {
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port: 587 });
    await assert.rejects(
      () => transport.sendMail({ from: 'a@test.invalid', to: 'b@test.invalid', text: 'x' }),
      /blocked in tests/,
    );
  });
});

describe('Environment resolution', () => {
  const base = {
    DATABASE_URL: 'mysql://ci:ci@localhost:3306/ci',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    JWT_REFRESH_SECRET: 'y'.repeat(32),
  };

  function resolve(extra: Record<string, string>) {
    const result = parseEnv({ ...base, ...extra });
    assert.ok(result.success, 'env should parse');
    return result.data;
  }

  it('makes MSG91_AUTHKEY canonical over stale legacy key names', () => {
    const data = resolve({
      MSG91_AUTHKEY: 'rotated-key-value',
      SMS_PROVIDER_API_KEY: 'stale-legacy-sms',
      MSG91_WHATSAPP_AUTHKEY: 'stale-legacy-wa',
    });
    assert.equal(data.SMS_PROVIDER_API_KEY, 'rotated-key-value');
    assert.equal(data.MSG91_WHATSAPP_AUTHKEY, 'rotated-key-value');
  });

  it('treats blank values as unset, so an empty alias never overrides a real value', () => {
    const data = resolve({
      MSG91_AUTHKEY: '',
      MSG91_WHATSAPP_AUTHKEY: '   ',
      SMS_PROVIDER_API_KEY: 'only-real-key',
      SMTP_USER: '',
      SMTP_USERNAME: 'mailer@example.com',
      SMTP_FROM: '',
      SMTP_FROM_EMAIL: 'receipts@example.com',
      EMAIL_FROM: '',
    });
    assert.equal(data.MSG91_AUTHKEY, undefined);
    assert.equal(data.SMS_PROVIDER_API_KEY, 'only-real-key');
    assert.equal(data.MSG91_WHATSAPP_AUTHKEY, undefined);
    assert.equal(data.SMTP_USER, 'mailer@example.com');
    assert.equal(data.SMTP_FROM, 'receipts@example.com');
    assert.equal(data.EMAIL_FROM, 'no-reply@sysaindia.org');
  });

  it('accepts the business sender number in +91 format', () => {
    const data = resolve({ MSG91_WHATSAPP_NUMBER: '+919490118877' });
    assert.equal(data.MSG91_WHATSAPP_INTEGRATED_NUMBER, '+919490118877');
  });
});

describe('WhatsApp recipient and template validation', () => {
  it('normalizes +91 / 91 / 0-prefixed / bare Indian mobiles', () => {
    for (const input of [
      '+919876543210',
      '919876543210',
      '09876543210',
      '9876543210',
      '+91 98765 43210',
    ]) {
      assert.equal(toWhatsAppMobile(input), '919876543210', input);
      assert.ok(isValidIndianMobile(input), input);
    }
  });

  it('rejects invalid mobiles without contacting any provider', async () => {
    for (const bad of ['12345', '5876543210', '98765432101234', '']) {
      assert.equal(isValidIndianMobile(bad), false, bad);
      const result = await sendWhatsAppReceipt({
        to: bad,
        customerName: 'Ravi',
        amountFormatted: '501',
        receiptNumber: 'RCPT-2026-000001',
        donationDate: '05 Sep 2026',
        paymentId: 'pay_x',
        documentUrl: null,
        filename: 'r.pdf',
      });
      assert.equal(result.status, 'failed');
      assert.equal(result.failureReason, 'Recipient mobile number is invalid');
    }
    assert.equal(networkGuard?.attempts.length, 0);
  });

  it('accepts a well-formed template variable map', () => {
    const result = parseTemplateVarMap(
      JSON.stringify({
        header_1: 'document',
        body_1: 'customerName',
        body_2: 'receiptNumber',
        button_1: 'receiptUrl',
      }),
    );
    assert.deepEqual(result, {
      ok: true,
      map: {
        header_1: 'document',
        body_1: 'customerName',
        body_2: 'receiptNumber',
        button_1: 'receiptUrl',
      },
    });
  });

  it('rejects malformed template variable maps instead of guessing', () => {
    const cases: Array<[string, RegExp]> = [
      ['not json', /not valid JSON/],
      ['[]', /must be a JSON object/],
      ['{}', /is empty/],
      ['{"body_1":"customer_name"}', /unknown field for "body_1"/],
      ['{"var1":"customerName"}', /unknown component "var1"/],
      ['{"body_0":"customerName"}', /unknown component "body_0"/],
      ['{"body_1":"document"}', /"document" is only valid for header_1/],
    ];
    for (const [raw, expected] of cases) {
      const result = parseTemplateVarMap(raw);
      assert.equal(result.ok, false, raw);
      if (!result.ok) assert.match(result.error, expected, raw);
    }
  });
});

describe('Frontend never carries MSG91 credentials or calls', () => {
  const websiteRoot = path.resolve(__dirname, '..', '..', '..', 'website');
  // Whole-word `authkey` (the MSG91 header) — not e.g. React Query `authKeys`.
  const SOURCE_PATTERN = /msg91|\bauthkey\b/i;
  const PUBLIC_SECRET_PATTERN =
    /^\s*NEXT_PUBLIC_[A-Z0-9_]*(MSG91|AUTHKEY|SMS_PROVIDER|SMTP|WHATSAPP)/im;
  const SKIP_DIRS = new Set(['node_modules', '.next', 'sysa_tmp_docx_extract']);

  function walk(dir: string, exts: RegExp, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, exts, out);
      else if (exts.test(entry.name)) out.push(full);
    }
    return out;
  }

  it('uses detection patterns that actually match credential usage', () => {
    assert.match('headers: { authkey: key }', SOURCE_PATTERN);
    assert.match('https://api.msg91.com/api/v5/whatsapp', SOURCE_PATTERN);
    assert.doesNotMatch('queryKey: authKeys.me', SOURCE_PATTERN);
    assert.match('NEXT_PUBLIC_MSG91_AUTHKEY=abc', PUBLIC_SECRET_PATTERN);
  });

  it('has no MSG91 references in website source or built bundle', () => {
    const files = [
      ...walk(path.join(websiteRoot, 'src'), /\.(tsx?|jsx?|mjs|json)$/),
      ...walk(path.join(websiteRoot, 'out'), /\.(js|html)$/),
      path.join(websiteRoot, 'next.config.ts'),
    ].filter((file) => fs.existsSync(file));
    assert.ok(files.length > 0, 'website sources not found');

    // Only file paths are reported — never file contents.
    const offenders = files.filter((file) => SOURCE_PATTERN.test(fs.readFileSync(file, 'utf8')));
    assert.deepEqual(offenders, []);
  });

  it('exposes no provider secret through NEXT_PUBLIC_ env vars', () => {
    const envFiles = fs
      .readdirSync(websiteRoot)
      .filter((name) => name.startsWith('.env'))
      .map((name) => path.join(websiteRoot, name));
    const offenders = envFiles.filter((file) =>
      PUBLIC_SECRET_PATTERN.test(fs.readFileSync(file, 'utf8')),
    );
    assert.deepEqual(offenders, []);
  });
});
