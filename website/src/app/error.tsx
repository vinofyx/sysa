'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { StatusPage } from '@/components/shared/status-page';

/**
 * Next.js App Router error boundary (must be a Client Component). Catches
 * unhandled rendering/data errors anywhere under the root layout — the
 * platform's "500" page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <StatusPage
      icon={AlertTriangle}
      title="Something went wrong"
      description="An unexpected error occurred. Please try again, or contact support if the problem persists."
      onRetry={reset}
    />
  );
}
