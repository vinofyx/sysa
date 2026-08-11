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
      className={`h-3 w-full overflow-hidden rounded-full bg-white/15 shadow-inner ${className ?? ''}`}
    >
      <div
        className="pub-gradient-gold relative h-full rounded-full shadow-[0_0_12px_rgba(200,155,60,0.6)] transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      >
        <span className="absolute inset-0 animate-pulse bg-white/20" />
      </div>
    </div>
  );
}
