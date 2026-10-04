/**
 * Test isolation — preloaded for every test process by `npm test`
 * (`--import ./src/tests/setup-env.ts`) and also imported by each test file,
 * so it applies even when a file forgets the import or NODE_ENV was inherited
 * wrongly from the shell. Idempotent: the second load is a no-op.
 *
 * 1. Scrubs every provider credential inherited from the shell/CI, and marks
 *    the process so `@config/env` never loads api/.env or api/.env.local.
 * 2. Blocks ALL outbound network at the socket + DNS layer. `fetch` (undici),
 *    `http`/`https` (Razorpay SDK), and nodemailer's SMTP all go through
 *    `net.Socket#connect`, so nothing can reach MSG91, SMTP, Razorpay or
 *    Cloudinary. Any attempt throws, is recorded, and fails the process.
 *    Tests exercise providers only through `mock.method` stubs.
 */
import dns from 'node:dns';
import net from 'node:net';

const guard = globalThis as typeof globalThis & {
  __sysaNetworkGuard?: { attempts: string[] };
};

if (!guard.__sysaNetworkGuard) {
  const attempts: string[] = [];
  guard.__sysaNetworkGuard = { attempts };

  process.env.NODE_ENV = 'test';
  process.env.SYSA_TEST_ISOLATION = '1';

  const PROVIDER_ENV = /^(MSG91_|SMS_|SMTP_|WHATSAPP_|RAZORPAY_|CLOUDINARY_|EMAIL_FROM$)/;
  for (const key of Object.keys(process.env)) {
    if (PROVIDER_ENV.test(key)) delete process.env[key];
  }

  process.env.DATABASE_URL = 'mysql://ci:ci@localhost:3306/ci';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-must-be-32-chars-min';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-must-be-32-chars-min';
  process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_key_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_razorpay_webhook_secret';
  process.env.LOG_LEVEL = 'error';

  const blocked = (target: string): Error => {
    attempts.push(target);
    return new Error(`Real network access is blocked in tests: ${target}`);
  };

  const describeTarget = (args: unknown[]): string => {
    const [first, second] = args;
    if (Array.isArray(first)) return describeTarget(first);
    if (first && typeof first === 'object') {
      const opts = first as { host?: string; port?: number; path?: string };
      return opts.path ?? `${opts.host ?? 'localhost'}:${opts.port ?? '?'}`;
    }
    return typeof first === 'number' ? `${String(second ?? 'localhost')}:${first}` : String(first);
  };

  // Fail like a refused connection (async 'error'), not a synchronous throw:
  // http/https agents call connect() from a nextTick, where a throw would
  // crash the process instead of failing the request cleanly.
  net.Socket.prototype.connect = function blockedConnect(this: net.Socket, ...args: unknown[]) {
    const error = blocked(describeTarget(args));
    process.nextTick(() => this.destroy(error));
    return this;
  } as typeof net.Socket.prototype.connect;

  dns.lookup = ((hostname: string, ...rest: unknown[]) => {
    const callback = rest.reverse().find((arg) => typeof arg === 'function') as
      ((error: Error) => void) | undefined;
    const error = blocked(`dns:${hostname}`);
    if (callback) process.nextTick(() => callback(error));
  }) as typeof dns.lookup;
  dns.promises.lookup = (async (hostname: string) => {
    throw blocked(`dns:${hostname}`);
  }) as typeof dns.promises.lookup;

  globalThis.fetch = async (input: string | URL | Request) => {
    throw blocked(String(input instanceof Request ? input.url : input));
  };

  process.on('exit', () => {
    if (attempts.length > 0) {
      console.error(`✖ ${attempts.length} blocked network attempt(s) in tests:`, attempts);
      process.exitCode = 1;
    }
  });
}

export const networkGuard = guard.__sysaNetworkGuard;
