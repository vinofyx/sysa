#!/usr/bin/env node
// Post-deployment smoke test — read-only. Never creates orders, donations or
// messages. Exits non-zero on any failure, so "deployment completed" is never
// mistaken for "the live site works".
//
//   npm run smoke -- https://sysa.in                 # production (website + API)
//   npm run smoke -- http://localhost:8081 --api-only --origin http://localhost:3031
//
// Checks, in the order Pay Now depends on them:
//   1. GET  /api/v1/health                   200 JSON, database ok
//   2. GET  /                                website HTML, not API JSON (skipped with --api-only)
//   3. GET  /api/v1/donation-categories/public  200 with categories (needs the database)
//   4. POST /api/v1/donations/initiate {}    400 VALIDATION_ERROR (route reachable, nothing created)
//   5. OPTIONS /api/v1/donations/initiate    CORS allows the website origin

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? '').replace(/\/+$/, '');
const apiOnly = args.includes('--api-only');
const originFlag = args.indexOf('--origin');
const origin = originFlag >= 0 ? args[originFlag + 1] : base;

if (!base) {
  console.error('Usage: npm run smoke -- <base-url> [--api-only] [--origin <website-origin>]');
  process.exit(2);
}

const TIMEOUT_MS = 20_000;
let failures = 0;

async function request(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...init,
  });
  const type = response.headers.get('content-type') ?? '';
  const text = await response.text();
  let json = null;
  if (type.includes('application/json')) {
    try {
      json = JSON.parse(text);
    } catch {
      // reported by the check that needed JSON
    }
  }
  return { status: response.status, type, text, json, headers: response.headers };
}

async function check(name, run) {
  try {
    const problem = await run();
    if (problem) {
      failures += 1;
      console.log(`FAIL  ${name} — ${problem}`);
    } else {
      console.log(`ok    ${name}`);
    }
  } catch (error) {
    failures += 1;
    const reason =
      error?.name === 'TimeoutError'
        ? `no response within ${TIMEOUT_MS / 1000}s`
        : (error?.cause?.code ?? error?.message ?? String(error));
    console.log(`FAIL  ${name} — request failed: ${reason}`);
  }
}

console.log(`Smoke test: ${base}${apiOnly ? ' (API only)' : ''}`);

await check('API health is 200 with database ok', async () => {
  const r = await request('/api/v1/health');
  if (!r.json) {
    return `HTTP ${r.status}, ${r.type || 'no content type'} — not the API's JSON (hosting error page or proxy?)`;
  }
  if (r.status !== 200 || r.json.checks?.database !== 'ok') {
    const category = r.json.checks?.databaseError;
    return `HTTP ${r.status}, database ${r.json.checks?.database ?? 'unknown'}${category ? ` (${category})` : ''}`;
  }
  return null;
});

if (!apiOnly) {
  await check('Homepage is the website, not the API', async () => {
    const r = await request('/');
    if (r.status !== 200) return `HTTP ${r.status}`;
    if (!r.type.includes('text/html'))
      return `content type ${r.type} — the domain is serving the API instead of the website`;
    return null;
  });
}

await check('Donation categories load (database-backed route)', async () => {
  const r = await request('/api/v1/donation-categories/public');
  if (r.status !== 200)
    return `HTTP ${r.status}${r.json?.error?.code ? ` (${r.json.error.code})` : ''}`;
  const count = Array.isArray(r.json?.categories) ? r.json.categories.length : 0;
  return count > 0 ? null : 'no active categories returned';
});

await check('Pay Now route reachable (empty body rejected, nothing created)', async () => {
  const r = await request('/api/v1/donations/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: '{}',
  });
  if (r.status === 400 && r.json?.error?.code === 'VALIDATION_ERROR') return null;
  return `expected 400 VALIDATION_ERROR, got HTTP ${r.status}${r.json?.error?.code ? ` (${r.json.error.code})` : ` ${r.type}`}`;
});

await check(`CORS allows ${origin}`, async () => {
  const r = await request('/api/v1/donations/initiate', {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
  });
  const allowed = r.headers.get('access-control-allow-origin');
  return allowed === origin ? null : `HTTP ${r.status}, allow-origin ${allowed ?? '(none)'}`;
});

console.log(failures === 0 ? 'PASS — all checks passed' : `FAILED — ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
