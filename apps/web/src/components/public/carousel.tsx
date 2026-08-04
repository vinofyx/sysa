'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

interface CarouselProps {
  children: React.ReactNode[];
  autoAdvanceMs?: number;
  className?: string;
  slideClassName?: string;
}

/** Generic auto-advancing carousel — pauses on hover/focus and respects
 * `prefers-reduced-motion` (design/09-Animation-Specifications.md §3), used
 * for both the homepage Hero Banner and the Testimonials section. */
export function Carousel({
  children,
  autoAdvanceMs = 6000,
  className,
  slideClassName,
}: CarouselProps) {
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
      <div
        className="flex transition-transform duration-500 ease-out"
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
            aria-label="Previous slide"
            className="bg-pub-neutral-white/80 hover:bg-pub-neutral-white absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label="Next slide"
            className="bg-pub-neutral-white/80 hover:bg-pub-neutral-white absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {children.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  'size-2 rounded-full transition-colors',
                  i === index ? 'bg-pub-gold-500' : 'bg-pub-neutral-white/60',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
