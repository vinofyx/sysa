import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * Hostinger Premium (shared hosting, no Node.js runtime) needs a pure static
 * `out/` directory — `next build` in standard `standalone` mode instead
 * produces a Node server bundle that shared hosting can't run. Both modes
 * build from this same config/codebase; the Docker/VPS path
 * (docker-compose.yml, website/Dockerfile) always builds with this flag
 * unset and is completely unaffected. Set via `npm run build:static`
 * (package.json), never by hand — `output: 'export'` is incompatible with
 * `headers()`/redirects/rewrites/the default Image Optimization loader, all
 * of which are conditioned on this same flag below.
 */
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

/**
 * Content-Security-Policy — the third-party script/frame/connect origins are
 * now known (Razorpay Checkout, integrated in Phase 7), so the CSP that was
 * previously deferred (see git history) can be written concretely.
 *
 * `script-src`/`style-src` include `'unsafe-inline'` because Next.js App
 * Router ships an inline hydration bootstrap script with no nonce
 * infrastructure wired up in this project; a stricter nonce-based CSP is a
 * worthwhile follow-up (see KNOWN_LIMITATIONS.md) but is a larger, riskier
 * change than is safe to make untested in this environment (no live
 * deployment to verify against). This policy still meaningfully restricts
 * which THIRD-PARTY origins can load scripts, frames, images, or receive
 * fetch/XHR connections — it is not a no-op.
 */
function buildContentSecurityPolicy(): string {
  // The backend API is a separate origin from this Next.js app (different
  // port in dev, typically a separate subdomain in production) — the public
  // site's client-side code calls it directly via axios, so it MUST be
  // allowed in connect-src or every fetch from the browser breaks.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const apiOrigin = new URL(apiUrl).origin;

  // `next dev`'s webpack runtime wraps every module in `eval(...)` for fast
  // rebuilds/source-mapping (its default dev `devtool`) — without
  // 'unsafe-eval', that eval call is itself blocked by this exact CSP,
  // which throws inside main-app.js before React ever hydrates, silently
  // breaking every client component on the page (forms, menus, animations)
  // with no visible error beyond a CSP console warning. `next build`'s
  // production bundles use plain function wrapping, not eval, so this is
  // scoped to development only and does not weaken the deployed policy.
  // Checkout's own script pulls in additional first-party scripts at runtime
  // (e.g. the risk-detection bundle served from cdn.razorpay.com) — a bare
  // `checkout.razorpay.com` allowance blocks those and silently breaks the
  // payment modal, so every Razorpay subdomain needs to be allowed here too.
  const scriptSrc =
    process.env.NODE_ENV === 'production'
      ? "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com https://images.unsplash.com",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://api.razorpay.com https://lumberjack.razorpay.com`,
    // The Payment Button embed (payment-button.js) opens its checkout in an
    // iframe on the bare `razorpay.com` domain, not `checkout.razorpay.com`
    // — unlike the Checkout.js modal used elsewhere, which stays on the
    // `checkout.` subdomain. Without this, the iframe is silently blocked
    // and the donor sees Chrome's "This content is blocked" placeholder.
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://razorpay.com https://*.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Next.js configuration — foundational settings only.
 * Route-level rewrites are added once needed; none exist yet.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Standalone output for lean Docker images (design/15-Deployment-Architecture.md §5);
  // 'export' for the Hostinger static build — see isStaticExport above.
  output: isStaticExport ? 'export' : 'standalone',

  // Default export naming (`about.html` next to an `about/` directory for
  // nested routes) needs Apache MultiViews or extension-rewriting to serve
  // clean URLs. `trailingSlash: true` instead emits `about/index.html`,
  // which Hostinger's Apache serves natively via its default DirectoryIndex
  // with zero rewrite rules — see public/.htaccess. Irrelevant in standalone
  // mode (Next's own server resolves routes directly either way).
  ...(isStaticExport ? { trailingSlash: true } : {}),

  images: isStaticExport
    ? // No server to run the Image Optimization loader on shared hosting —
      // next/image falls back to plain <img> tags using the original src
      // (Cloudinary URLs and /images/real/*.jpg both work unoptimized).
      { unoptimized: true }
    : {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'res.cloudinary.com',
          },
          {
            // Curated stock photography used for premium hero/section imagery
            // until the Ashram supplies real photos via the Gallery/Activities
            // CMS — see components/public/stock-images.ts.
            protocol: 'https',
            hostname: 'images.unsplash.com',
          },
        ],
      },

  // `headers()` (and redirects/rewrites) are rejected outright by
  // `output: 'export'` — Hostinger's Apache serves these same security
  // headers instead, via website/public/.htaccess.
  ...(isStaticExport
    ? {}
    : {
        async headers() {
          return [
            {
              // Baseline security headers (documentation/12-Security-Requirements.md §7).
              source: '/:path*',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
              ],
            },
          ];
        },
      }),
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
