/** StatusPill (design/07-Component-Library.md §5.2) for the public site —
 * separate from the admin `StatusBadge` since it uses the public gold/green
 * palette instead of the admin's neutral shadcn tokens. */
const VARIANT_CLASSES: Record<string, string> = {
  completed: 'bg-pub-primary-100 text-pub-primary-700',
  published: 'bg-pub-primary-100 text-pub-primary-700',
  upcoming: 'bg-pub-gold-100 text-pub-gold-700',
  pending: 'bg-pub-gold-100 text-pub-gold-700',
  cancelled: 'bg-red-100 text-red-700',
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
