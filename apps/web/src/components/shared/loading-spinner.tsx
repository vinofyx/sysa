import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export function LoadingSpinner({
  className,
  label = 'Loading…',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn('text-muted-foreground flex items-center gap-2 text-sm', className)}
      role="status"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}
