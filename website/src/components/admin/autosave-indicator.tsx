import { Check, Loader2, CircleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function AutosaveIndicator({
  status,
  className,
}: {
  status: AutosaveStatus;
  className?: string;
}) {
  if (status === 'idle') return null;

  return (
    <span className={cn('text-muted-foreground flex items-center gap-1.5 text-xs', className)}>
      {status === 'saving' && (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Saving…
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="size-3.5 text-green-600 dark:text-green-400" /> All changes saved
        </>
      )}
      {status === 'error' && (
        <>
          <CircleAlert className="text-destructive size-3.5" /> Failed to save
        </>
      )}
    </span>
  );
}
