import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-info/10 text-info border-info/20',
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
  authenticated: 'success',
  // Razorpay's own payment vocabulary (raw `razorpayPaymentStatus`) and this
  // feature's settlement vocabulary — kept in the same shared map so both
  // read consistently wherever <StatusBadge> is reused.
  captured: 'success',
  settled: 'success',
  assigned: 'info',
  in_progress: 'info',
  under_review: 'info',
  pending_verification: 'info',
  submitted: 'info',
  created: 'info',
  pending: 'warning',
  paused: 'warning',
  authorized: 'warning',
  not_settled: 'warning',
  draft: 'neutral',
  archived: 'neutral',
  inactive: 'neutral',
  expired: 'neutral',
  unknown: 'neutral',
  cancelled: 'destructive',
  rejected: 'destructive',
  failed: 'destructive',
  refunded: 'destructive',
  'partially refunded': 'warning',
  halted: 'destructive',
  unverified: 'warning',
  generated: 'success',
  sent: 'success',
  queued: 'warning',
  'not sent': 'neutral',
  'not generated': 'neutral',
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
