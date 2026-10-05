/** StatusPill (design/07-Component-Library.md §5.2) for the public site —
 * separate from the admin `StatusBadge` since it uses the public gold/green
 * palette instead of the admin's neutral shadcn tokens. */
const VARIANT_CLASSES: Record<string, string> = {
  completed:
    'bg-pub-primary-100 text-pub-primary-700 dark:bg-pub-primary-900/40 dark:text-pub-gold-300',
  published:
    'bg-pub-primary-100 text-pub-primary-700 dark:bg-pub-primary-900/40 dark:text-pub-gold-300',
  upcoming: 'bg-pub-gold-100 text-pub-gold-700 dark:text-pub-gold-300',
  pending: 'bg-pub-gold-100 text-pub-gold-700 dark:text-pub-gold-300',
  cancelled: 'bg-pub-error-100 text-pub-error-700 dark:text-pub-error-300',
  draft: 'bg-pub-neutral-200 text-pub-neutral-500',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const classes = VARIANT_CLASSES[status] ?? VARIANT_CLASSES.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}
    >
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}
