import type { NextConfig } from 'next';

/**
 * Next.js configuration — foundational settings only.
 * Remote image patterns (Cloudinary) and route-level rewrites are added once
 * the actual media/content integration is implemented (see
 * documentation/16-Assumptions-and-Dependencies.md D-01/D-10 for pending
 * Cloudinary/media dependencies).
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
        // Content-Security-Policy is intentionally deferred to the feature-development
        // phase, once third-party script origins (Razorpay, analytics) are finalized.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
