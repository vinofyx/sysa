import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  neutral: 'bg-muted text-muted-foreground border-transparent',
};

/**
 * Maps arbitrary backend status strings to the StatusPill variants defined
 * in design/07-Component-Library.md §5.2 (pending=gold/warning,
 * completed/verified/approved=green, failed/rejected=red, draft=neutral,
 * under-review/pending_verification=info).
 */
const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  active: 'success',
  published: 'success',
  completed: 'success',
  verified: 'success',
  approved: 'success',
  registered: 'success',
  assigned: 'info',
  in_progress: 'info',
  under_review: 'info',
  pending_verification: 'info',
  submitted: 'info',
  pending: 'warning',
  draft: 'neutral',
  archived: 'neutral',
  inactive: 'neutral',
  cancelled: 'destructive',
  rejected: 'destructive',
  failed: 'destructive',
  refunded: 'destructive',
  unverified: 'warning',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = STATUS_VARIANT_MAP[status.toLowerCase()] ?? 'neutral';
  const label = status.replace(/_/g, ' ');
  return (
    <Badge
      variant="outline"
      className={cn('border capitalize', VARIANT_CLASSES[variant], className)}
    >
      {label}
    </Badge>
  );
}
