// Hostinger static-export build wrapper.
//
// `output: 'export'` requires every route Next.js discovers under `src/app`
// to be statically renderable. `src/app/admin` calls the live backend at
// request time via a Server Component (`getServerUser()` in admin/layout.tsx)
// and is fundamentally incompatible with static export — no per-request
// server execution exists once this is deployed as static files. It's
// explicitly required to stay out of the static bundle.
//
// `src/app/(auth)` is mixed: `/login` and `/forgot-password` are plain
// client-rendered pages with no build-time data dependency and export fine
// (their form submissions call the API at runtime from the browser, same
// pattern as the static Volunteer/Contact forms) — see
// components/public/site-footer.tsx for where `/login` is linked from.
// `/reset-password/[token]` and `/verify-email/[token]` have dynamic
// segments with no known token list at build time, so those two stay
// excluded rather than adding a fake `generateStaticParams`.
//
// Deleting any of this source isn't allowed either, since it must keep
// working for the normal `standalone`/Docker build.
//
// This script temporarily moves the excluded route trees out of `src/app`,
// drops in a static `/admin` placeholder, text-swaps a couple of route
// segment configs that Next.js requires to be literals (see TEXT_SWAPS
// below), runs the export build, and always restores every original file
// afterward (success or failure) so the working tree is never left modified.
import { existsSync } from 'node:fs';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const appDir = path.join(webRoot, 'src', 'app');
const holdingDir = path.join(webRoot, '.static-export-excluded');

const EXCLUDED = [
  { name: 'admin', src: path.join(appDir, 'admin') },
  { name: 'auth-reset-password', src: path.join(appDir, '(auth)', 'reset-password') },
  { name: 'auth-verify-email', src: path.join(appDir, '(auth)', 'verify-email') },
];

const PLACEHOLDER_ADMIN_PAGE = `import { ShieldOff } from 'lucide-react';

// Static placeholder for the Hostinger export build only — the real admin
// CMS (src/app/admin, moved aside during this build) is not part of this
// deployment. No auth logic, no login form: this route is purely
// informational. Standalone/Docker builds never see this file.
export default function AdminUnavailablePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <ShieldOff className="size-10 text-neutral-400" aria-hidden />
      <h1 className="text-xl font-semibold text-neutral-800">Admin portal unavailable</h1>
      <p className="max-w-md text-sm text-neutral-500">
        This is a static copy of the Sai Yadadri Seva Ashram website. The admin CMS runs only on
        the full server deployment and is not available here.
      </p>
    </main>
  );
}
`;

// Next.js requires route segment config (`export const dynamic = ...`,
// `export const dynamicParams = ...`) to be literal values it can read via
// static analysis — not a ternary, not an imported reference — so these
// files can't branch on lib/static-mode.ts's STATIC_EXPORT flag the way
// every other file in this codebase does. Each entry's `standalone` text is
// what ships normally; it's swapped to `static` for the duration of the
// export build only, then swapped back, regardless of build outcome.
const TEXT_SWAPS = [
  {
    file: path.join(appDir, '(public)', 'layout.tsx'),
    standalone: "export const dynamic = 'force-dynamic';",
    static: "export const dynamic = 'force-static';",
  },
  {
    file: path.join(appDir, '(public)', 'donate', 'receipt', '[id]', 'page.tsx'),
    standalone:
      'export function generateStaticParams() {\n  return [];\n}\nexport const dynamicParams = true;',
    static:
      "export function generateStaticParams() {\n  return [{ id: 'unavailable' }];\n}\nexport const dynamicParams = false;",
  },
  {
    // Same constraint as the receipt route above — `output: 'export'` needs
    // generateStaticParams() to yield at least one entry for a `[slug]`
    // route. `content/news.ts` is normally non-empty, so this only bites
    // when someone empties it (e.g. no news articles published yet); the
    // conditional keeps this working automatically either way, without
    // needing another edit here once real articles come back.
    file: path.join(appDir, '(public)', 'news', '[slug]', 'page.tsx'),
    standalone:
      'export function generateStaticParams() {\n  return newsPosts.map((post) => ({ slug: post.slug }));\n}',
    static:
      "export function generateStaticParams() {\n  const params = newsPosts.map((post) => ({ slug: post.slug }));\n  return params.length > 0 ? params : [{ slug: 'unavailable' }];\n}\nexport const dynamicParams = false;",
  },
];

// Razorpay TEST-mode Payment Links (content/payment-links.ts) must never
// reach the real Hostinger upload's compiled output — confirmed empirically
// that relying on `process.env.X ? [...] : []` dead-code elimination is NOT
// reliable with Next 15's SWC minifier (the URL strings survived minification
// intact). This blanks the array to `[]` at the SOURCE level instead, which
// is compiler-independent: the URLs simply aren't in the file being compiled.
// Skipped entirely when NEXT_PUBLIC_SHOW_TEST_PAYMENT_LINKS=true is set for a
// deliberate local QA build that actually needs the test links to click through.
const showTestPaymentLinks = process.env.NEXT_PUBLIC_SHOW_TEST_PAYMENT_LINKS === 'true';
if (!showTestPaymentLinks) {
  TEXT_SWAPS.push({
    file: path.join(webRoot, 'src', 'content', 'payment-links.ts'),
    standalone: `export const TEST_PAYMENT_LINKS: DonationPaymentLink[] = [
  { amount: 500, url: 'https://rzp.io/rzp/I7zw79s' },
  { amount: 1000, url: 'https://rzp.io/rzp/LCVQcfk' },
  { amount: 2500, url: 'https://rzp.io/rzp/oxh147K' },
  { amount: 5000, url: 'https://rzp.io/rzp/3lGrsbGv' },
];`,
    static: 'export const TEST_PAYMENT_LINKS: DonationPaymentLink[] = [];',
  });
}

// Windows checkouts of this repo mix CRLF and LF line endings depending on
// how each file was last written (git's core.autocrlf vs. tools that write
// raw LF) — exact-substring matching on `standalone`/`static` (which are
// authored with plain `\n`) breaks the moment a target file happens to be
// CRLF. This matches either style and substitutes using whichever style the
// matched region actually used, so the file's existing line-ending
// convention is preserved rather than silently rewritten.
function crlfTolerantSwap(src, from, to) {
  const pattern = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\n/g, '\r?\n');
  const match = src.match(new RegExp(pattern));
  if (!match) return null;
  const usesCrlf = match[0].includes('\r\n');
  const replacement = usesCrlf ? to.replace(/\n/g, '\r\n') : to;
  return src.slice(0, match.index) + replacement + src.slice(match.index + match[0].length);
}

async function applyTextSwaps() {
  for (const { file, standalone, static: staticText } of TEXT_SWAPS) {
    const src = await readFile(file, 'utf-8');
    const result = crlfTolerantSwap(src, standalone, staticText);
    if (result === null) {
      throw new Error(
        `Expected to find:\n${standalone}\nin ${file} — it may have changed; update scripts/build-static.mjs.`,
      );
    }
    await writeFile(file, result, 'utf-8');
  }
}

async function revertTextSwaps() {
  for (const { file, standalone, static: staticText } of TEXT_SWAPS) {
    if (!existsSync(file)) continue;
    const src = await readFile(file, 'utf-8');
    const result = crlfTolerantSwap(src, staticText, standalone);
    if (result !== null) {
      await writeFile(file, result, 'utf-8');
    }
  }
}

async function moveAside() {
  await mkdir(holdingDir, { recursive: true });
  for (const { name, src } of EXCLUDED) {
    if (!existsSync(src)) continue;
    const dest = path.join(holdingDir, name);
    await cp(src, dest, { recursive: true });
    await rm(src, { recursive: true, force: true });
  }
  await mkdir(path.join(appDir, 'admin'), { recursive: true });
  await writeFile(path.join(appDir, 'admin', 'page.tsx'), PLACEHOLDER_ADMIN_PAGE, 'utf-8');

  await applyTextSwaps();
}

async function restore() {
  await rm(path.join(appDir, 'admin'), { recursive: true, force: true });
  for (const { name, src } of EXCLUDED) {
    const held = path.join(holdingDir, name);
    if (existsSync(held)) {
      await cp(held, src, { recursive: true });
    }
  }
  await rm(holdingDir, { recursive: true, force: true });

  await revertTextSwaps();
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn('next', ['build'], {
      cwd: webRoot,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: 'true' },
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`next build exited with code ${code}`)),
    );
  });
}

// `/login`/`/forgot-password` call the backend via NEXT_PUBLIC_API_URL, which
// Next.js inlines into the compiled JS chunks at build time (not visible by
// grepping the HTML — it's in _next/static/chunks). If whoever runs this
// build hasn't set a real production API URL, Next.js silently falls back
// to .env.local's dev default (http://localhost:5050), and every visitor's
// browser on the deployed site would try to call their OWN machine — a
// silent, hard-to-diagnose production failure with no build-time signal.
//
// Matches the exact object-literal assignment `lib/env.ts`'s zod schema
// produces once webpack's DefinePlugin substitutes `process.env.NEXT_PUBLIC_
// API_URL` at build time — e.g. `NEXT_PUBLIC_API_URL:"http://localhost:5050"`
// in the minified output (confirmed by inspecting an actual build: object
// literal *keys* survive minification unmangled, only local variable/function
// names get renamed). Anchoring on our own env-var name, rather than any bare
// loopback substring anywhere in the bundle, is what makes this reliable — a
// generic `http://localhost(:\d+)?` scan already false-positived twice on
// unrelated framework internals that ship in every build regardless of API
// config: axios's own bundled `window.location.href || "http://localhost"`
// SSR-safety fallback (axios/lib/platform/browser/index.js, no port), and a
// literal `// example: at Page (http://localhost:3000/...)` comment inside
// Next.js's own bundled error-stack-parsing helper (has a port, but is inert
// source text, never a real request). Neither of those — nor anything else
// in the framework or its dependencies — can ever contain the literal string
// "NEXT_PUBLIC_API_URL", so this can't repeat that failure mode.
const LOOPBACK_URL_PATTERN =
  /NEXT_PUBLIC_API_URL\s*:\s*["']https?:\/\/(?:localhost|127\.0\.0\.1|\[?::1\]?)(?::\d+)?["']/;
const RENDER_API_URL_PATTERN = /NEXT_PUBLIC_API_URL\s*:\s*["'][^"']*onrender\.com[^"']*["']/;

async function checkForLoopbackApiUrl() {
  const chunksDir = path.join(webRoot, 'out', '_next', 'static', 'chunks');
  if (!existsSync(chunksDir)) return;

  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(chunksDir, { recursive: true, withFileTypes: true });
  const loopbackOffenders = [];
  const renderOffenders = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const filePath = path.join(entry.parentPath ?? entry.path, entry.name);
    const contents = await readFile(filePath, 'utf-8');
    const relative = path.relative(webRoot, filePath);
    if (RENDER_API_URL_PATTERN.test(contents)) renderOffenders.push(relative);
    if (LOOPBACK_URL_PATTERN.test(contents)) loopbackOffenders.push(relative);
  }

  if (renderOffenders.length > 0) {
    throw new Error(
      'Refusing to ship a production build whose JS bundles still call Render ' +
        '(NEXT_PUBLIC_API_URL must not contain onrender.com).\n' +
        '   Fix: NEXT_PUBLIC_API_URL=https://sysa.in npm run build:static\n' +
        '   Affected files:\n' +
        renderOffenders.map((f) => '     - ' + f).join('\n'),
    );
  }

  if (loopbackOffenders.length === 0) return;

  const allowed = process.env.ALLOW_LOCALHOST_API === 'true';
  const summary =
    'a dev-only loopback API URL is baked into the production JS bundles ' +
    '(NEXT_PUBLIC_API_URL was not set to a real production value for this build).\n' +
    '   Admin Login (/login, /forgot-password) will NOT work once uploaded to Hostinger — ' +
    "every visitor's browser would try to reach their own machine, not a real server.\n" +
    '   The rest of the site (public pages, floating socials, Volunteer/Contact forms) is unaffected.\n' +
    '   Fix: set NEXT_PUBLIC_API_URL to the real deployed backend API URL before running this build, e.g.\n' +
    // NEXT_PUBLIC_API_URL is the bare API origin — api-client.ts appends
    // `/api/v1` itself, and nginx's `location /api/` proxies straight through
    // to the api service without stripping the prefix (infrastructure/nginx/
    // conf.d/default.conf), so a value ending in `/api` here would double it
    // up into `/api/api/v1/...` and break every request.
    '     NEXT_PUBLIC_API_URL=https://sysa.in npm run build:static\n' +
    '   Affected files:\n' +
    loopbackOffenders.map((f) => '     - ' + f).join('\n');

  if (allowed) {
    console.log(`\nℹ️  Dev build (ALLOW_LOCALHOST_API=true) — ${summary}`);
  } else {
    throw new Error(
      `Refusing to ship a production build with a loopback API URL — ${summary}\n` +
        '   To intentionally build a local/dev-only artifact anyway, set ALLOW_LOCALHOST_API=true.',
    );
  }
}

let exitCode = 0;
try {
  await moveAside();
  await runBuild();
  await checkForLoopbackApiUrl();
  console.log('\nStatic export complete: website/out/');
} catch (err) {
  console.error('\nStatic export build failed:', err.message);
  exitCode = 1;
} finally {
  await restore();
}
process.exit(exitCode);
