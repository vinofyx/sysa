'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

interface CarouselProps {
  children: React.ReactNode[];
  autoAdvanceMs?: number;
  className?: string;
  slideClassName?: string;
  /** `light` (default) is tuned for slides over a dark/image background
   * (Hero Banner) — white dots, glass arrows. `dark` is tuned for slides on
   * the page's normal ivory background (Testimonials) — emerald-tinted
   * dots/arrows so they stay visible against a light surface. */
  dotVariant?: 'light' | 'dark';
}

/** Generic auto-advancing carousel — pauses on hover/focus and respects
 * `prefers-reduced-motion` (design/09-Animation-Specifications.md §3), used
 * for both the homepage Hero Banner and the Testimonials section. */
export function Carousel({
  children,
  autoAdvanceMs = 6000,
  className,
  slideClassName,
  dotVariant = 'light',
}: CarouselProps) {
  const t = useTranslations('Common');
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reducedMotion = useReducedMotion();
  const count = children.length;

  React.useEffect(() => {
    if (reducedMotion || paused || count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), autoAdvanceMs);
    return () => clearInterval(timer);
  }, [reducedMotion, paused, count, autoAdvanceMs]);

  if (count === 0) return null;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* `h-full` here is required for `slideClassName="h-full"` callers (Hero
          Banner) to actually stretch — percentage heights resolve to `auto`
          through an intermediate box with no explicit height, which silently
          breaks `items-center` vertical centering inside each slide. Callers
          that don't size the outer wrapper (Testimonials) are unaffected,
          since `h-full` against an auto-height parent still resolves to `auto`. */}
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {children.map((child, i) => (
          <div key={i} className={cn('w-full shrink-0', slideClassName)} aria-hidden={i !== index}>
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            aria-label={t('previousSlide')}
            className={cn(
              'shadow-pub-md hover:bg-pub-gold-500 hover:text-pub-primary-950 absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full transition-all hover:scale-110 sm:left-5',
              dotVariant === 'light'
                ? 'pub-glass'
                : 'text-pub-primary-800 dark:text-pub-gold-300 bg-pub-neutral-white',
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label={t('nextSlide')}
            className={cn(
              'shadow-pub-md hover:bg-pub-gold-500 hover:text-pub-primary-950 absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full transition-all hover:scale-110 sm:right-5',
              dotVariant === 'light'
                ? 'pub-glass'
                : 'text-pub-primary-800 dark:text-pub-gold-300 bg-pub-neutral-white',
            )}
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {children.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t('goToSlide', { number: i + 1 })}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === index
                    ? 'pub-gradient-gold w-7'
                    : dotVariant === 'light'
                      ? 'w-2 bg-white/60 hover:bg-white/90'
                      : 'bg-pub-primary-100 hover:bg-pub-primary-500/40 dark:bg-pub-gold-100 dark:hover:bg-pub-gold-500/40 w-2',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
