import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StatusPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
  /** Callers that already sit inside the site header/footer chrome (e.g. a
   * 404 page rendered with full navigation around it) should override the
   * default `min-h-screen` so the page doesn't grow taller than the
   * viewport on top of that chrome. */
  className?: string;
}

/** Shared shell for 404 / 500 / 403 pages — design/05-Wireframes.md calls for a
 * consistent, on-brand empty/error state rather than a bare framework default. */
export function StatusPage({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onRetry,
  className,
}: StatusPageProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center',
        className,
      )}
    >
      <Icon className="text-muted-foreground size-12" />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try again
        </Button>
      )}
      {actionLabel && actionHref && (
        <Button render={<Link href={actionHref} />}>{actionLabel}</Button>
      )}
    </div>
  );
}
