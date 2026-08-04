import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

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

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://api.razorpay.com https://lumberjack.razorpay.com`,
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
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

  // Standalone output for lean Docker images (design/15-Deployment-Architecture.md §5).
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

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
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
