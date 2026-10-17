import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { envFilesToLoad, loadEnvFiles } from '@config/env';

describe('.env.local is never loaded in production', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sysa-env-files-'));
  fs.writeFileSync(
    path.join(dir, '.env'),
    'RAZORPAY_KEY_ID=rzp_live_fromdotenv\nNOTIFICATIONS_MODE=dry_run\nAPI_URL=https://sysa.in\n',
  );
  fs.writeFileSync(
    path.join(dir, '.env.local'),
    'NODE_ENV=development\nRAZORPAY_KEY_ID=rzp_test_fromlocal\nNOTIFICATIONS_MODE=live\nAPI_URL=http://localhost:4000\n',
  );
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('production host: only .env is read, .env.local cannot override anything', () => {
    const target: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
    assert.deepEqual(loadEnvFiles(target, dir), ['.env']);
    assert.equal(target.NODE_ENV, 'production');
    assert.equal(target.RAZORPAY_KEY_ID, 'rzp_live_fromdotenv');
    assert.equal(target.NOTIFICATIONS_MODE, 'dry_run');
    assert.equal(target.API_URL, 'https://sysa.in');
  });

  it('production host: host-set variables still win over .env', () => {
    const target: NodeJS.ProcessEnv = { NODE_ENV: 'production', NOTIFICATIONS_MODE: 'live' };
    loadEnvFiles(target, dir);
    assert.equal(target.NOTIFICATIONS_MODE, 'live');
  });

  it('local development (NODE_ENV not set by the host): .env.local still overrides .env', () => {
    const target: NodeJS.ProcessEnv = {};
    assert.deepEqual(loadEnvFiles(target, dir), ['.env', '.env.local']);
    assert.equal(target.NODE_ENV, 'development');
    assert.equal(target.RAZORPAY_KEY_ID, 'rzp_test_fromlocal');
    assert.equal(target.NOTIFICATIONS_MODE, 'live');
  });

  it('decides on the host NODE_ENV only', () => {
    assert.deepEqual(envFilesToLoad('production'), ['.env']);
    assert.deepEqual(envFilesToLoad('development'), ['.env', '.env.local']);
    assert.deepEqual(envFilesToLoad(undefined), ['.env', '.env.local']);
  });
});

describe('host environment wins over an uploaded .env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sysa-env-host-'));
  fs.writeFileSync(path.join(dir, '.env'), 'DATABASE_URL=mysql://from-file\n');
  fs.writeFileSync(path.join(dir, '.env.local'), 'DATABASE_URL=mysql://from-local\n');
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('production: hPanel DATABASE_URL is kept; neither file replaces it', () => {
    const target: NodeJS.ProcessEnv = { NODE_ENV: 'production', DATABASE_URL: 'mysql://from-host' };
    loadEnvFiles(target, dir);
    assert.equal(target.DATABASE_URL, 'mysql://from-host');
  });

  it('production without a host value: .env fills it, .env.local never does', () => {
    const target: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
    loadEnvFiles(target, dir);
    assert.equal(target.DATABASE_URL, 'mysql://from-file');
  });
});
