export function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`bg-pub-neutral-200 h-2 w-full overflow-hidden rounded-full ${className ?? ''}`}
    >
      <div
        className="bg-pub-primary-700 h-full rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
