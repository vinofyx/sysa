import { Reveal } from '@/components/public/motion';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  align?: 'center' | 'left';
}) {
  const centered = align === 'center';
  return (
    <Reveal className={cn('max-w-2xl', centered ? 'mx-auto text-center' : 'text-left', className)}>
      {eyebrow && (
        <p
          className={cn(
            'text-pub-gold-700 mb-3 flex items-center gap-2.5 text-xs font-semibold tracking-[0.22em] uppercase',
            centered && 'justify-center',
          )}
        >
          <span className="pub-gradient-gold h-px w-6" />
          {eyebrow}
        </p>
      )}
      <h2 className="font-pub-heading text-pub-primary-950 text-3xl leading-[1.15] font-semibold text-balance sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'text-pub-neutral-500 mt-4 max-w-xl text-base leading-relaxed sm:text-lg',
            centered && 'mx-auto',
          )}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
