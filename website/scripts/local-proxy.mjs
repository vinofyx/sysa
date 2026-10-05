#!/usr/bin/env node
/**
 * Local-only dev utility — NOT part of the shipped app or the Hostinger
 * static build. Serves the static export (`website/out/`, the same content
 * `serve -l 5060 website/out` would) on :5060, but carves out two exceptions
 * so the real, server-rendered Admin CMS is reachable from the same origin:
 *
 *   /api/*   -> http://localhost:5050  (the real Express API — see
 *                                        api/.env.local, this is now also
 *                                        the dedicated payment/Razorpay API
 *                                        port)
 *   /admin*  -> http://localhost:3030  (the real `next dev`/`next start`
 *                                        server — the static build swaps
 *                                        this route for a placeholder,
 *                                        see scripts/build-static.mjs)
 *   everything else -> served from website/out/ on disk, exactly like the
 *                       existing `static-export-preview` launch config.
 *
 * This mirrors infrastructure/nginx/conf.d/default.conf's real production
 * routing intent (/api/* to Express, everything else to Next.js), just with
 * the public site served from static files instead of a running Next.js
 * server. Moved off :5050 to :5060 once :5050 became the dedicated payment
 * API port (see .claude/launch.json) — was previously the main static-only
 * preview port.
 *
 * Usage: node scripts/local-proxy.mjs [port]
 * Requires the API (npm run dev --workspace=api, port 5050) and the Next.js
 * dev server (npm run dev --workspace=website, port 3030) already running.
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUT_DIR = join(__dirname, '..', 'out');
const PORT = Number(process.argv[2]) || 5060;

const API_TARGET = { host: 'localhost', port: 5050 };
const ADMIN_TARGET = { host: 'localhost', port: 3030 };

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/** Streams the upstream request/response through verbatim — method, headers,
 * body, status — so cookies, CORS headers, and auth all behave exactly as
 * they would talking to the upstream directly. */
function proxy(req, res, target) {
  const upstreamReq = http.request(
    {
      host: target.host,
      port: target.port,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstreamReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Upstream ${target.host}:${target.port} unreachable: ${err.message}`);
  });
  req.pipe(upstreamReq);
}

/** Resolves a URL path to a file under OUT_DIR, trying directory-index and
 * `.html` fallbacks (`next export` with `trailingSlash: true` writes
 * "/foo/index.html" for "/foo/" but also "/foo.html" for some routes).
 * Returns null if nothing on disk matches. */
function resolveFilePath(urlPath) {
  let filePath = normalize(join(OUT_DIR, urlPath));

  // Guard against path traversal escaping OUT_DIR.
  if (!filePath.startsWith(OUT_DIR)) return undefined; // Forbidden, not just "not found".

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }
  if (existsSync(filePath)) return filePath;

  const withHtml = `${filePath}.html`;
  if (existsSync(withHtml)) return withHtml;

  return null;
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  const filePath = resolveFilePath(urlPath);
  if (filePath === undefined) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!filePath) {
    const notFound = join(OUT_DIR, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    if (existsSync(notFound)) createReadStream(notFound).pipe(res);
    else res.end('404 Not Found');
    return;
  }

  const contentType = MIME_TYPES[extname(filePath)] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

/** `/_next/static/*` asset URLs are hash-named per build — the static
 * export's own hashes and `next dev`'s hashes are different and mutually
 * incompatible, so a shared `/_next/*` prefix can't be routed by path alone.
 * The asset always belongs to whichever page requested it, which the
 * `Referer` header reveals — an admin page pulls its own dev-server assets,
 * a public static page pulls its own out/ assets. */
function isFromAdminPage(req) {
  const referer = req.headers.referer;
  if (!referer) return false;
  try {
    return new URL(referer).pathname.startsWith('/admin');
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    proxy(req, res, API_TARGET);
  } else if (req.url.startsWith('/admin') || (req.url.startsWith('/_next/') && isFromAdminPage(req))) {
    proxy(req, res, ADMIN_TARGET);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Local full-stack preview on http://localhost:${PORT}`);
  console.log(`  /api/*  -> http://${API_TARGET.host}:${API_TARGET.port}`);
  console.log(`  /admin* -> http://${ADMIN_TARGET.host}:${ADMIN_TARGET.port}`);
  console.log(`  else    -> ${OUT_DIR}`);
});
