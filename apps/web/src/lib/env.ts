import { z } from 'zod';

/**
 * Client-side environment schema — validates the `NEXT_PUBLIC_*` variables the
 * browser bundle actually needs. Mirrors the fail-fast pattern used on the API
 * (apps/api/src/config/env.ts) so a missing/malformed value is caught at build
 * time rather than surfacing as a confusing runtime error deep in a component.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

function validateClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    console.error('❌ Invalid client environment configuration:', parsed.error.flatten());
    throw new Error('Invalid client environment configuration');
  }

  return parsed.data;
}

export const env = validateClientEnv();
