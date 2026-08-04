export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-2xl text-center ${className ?? ''}`}>
      {eyebrow && (
        <p className="text-pub-gold-700 mb-2 text-xs font-semibold tracking-widest uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="font-pub-heading text-pub-primary-900 text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="text-pub-neutral-500 mt-2 text-sm sm:text-base">{subtitle}</p>}
    </div>
  );
}
