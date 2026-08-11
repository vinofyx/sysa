'use client';

import * as React from 'react';
import { motion, useInView, type Variants } from 'framer-motion';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

type RevealVariant = 'fade-up' | 'fade' | 'scale' | 'slide-left' | 'slide-right';

const VARIANTS: Record<RevealVariant, Variants> = {
  'fade-up': {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.94 },
    visible: { opacity: 1, scale: 1 },
  },
  'slide-left': {
    hidden: { opacity: 0, x: 36 },
    visible: { opacity: 1, x: 0 },
  },
  'slide-right': {
    hidden: { opacity: 0, x: -36 },
    visible: { opacity: 1, x: 0 },
  },
};

interface RevealProps {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
  once?: boolean;
}

/** Scroll-triggered reveal wrapper (design/09-Animation-Specifications.md
 * "Fade / Slide / Scale" scroll animations). Always respects
 * `prefers-reduced-motion` — renders children statically, no transform.
 *
 * Content must never depend solely on `IntersectionObserver` firing to
 * become visible — some browser contexts (backgrounded/inactive tabs,
 * certain automation/embedding contexts) delay or never fire intersection
 * callbacks, which would otherwise leave the element stuck at `opacity: 0`
 * forever. A short safety-net timer forces the element visible regardless,
 * so the reveal animation is progressive enhancement, not a visibility gate. */
export function Reveal({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 0.6,
  className,
  as = 'div',
  once = true,
}: RevealProps) {
  const reducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount: 0.2 });
  const [timedOut, setTimedOut] = React.useState(false);
  // Typed as `motion.div` regardless of the actual tag chosen — `motion[as]`
  // otherwise resolves to a union whose `ref`/prop types TypeScript can only
  // satisfy with an intersection, which a single generic ref can't match.
  // The rendered DOM tag is still whatever `as` specifies at runtime.
  const MotionTag = motion[as] as typeof motion.div;

  React.useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 900);
    return () => clearTimeout(timer);
  }, []);

  if (reducedMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView || timedOut ? 'visible' : 'hidden'}
      variants={VARIANTS[variant]}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/** Applies a staggered `delay` to each direct child via `Reveal` — used for
 * card grids so items cascade in rather than popping simultaneously. */
export function RevealGroup({
  children,
  variant = 'fade-up',
  stagger = 0.08,
  className,
  itemClassName,
}: {
  children: React.ReactNode[];
  variant?: RevealVariant;
  stagger?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <Reveal variant={variant} delay={index * stagger} className={itemClassName}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}

/** Parses a free-text CMS stat value like "1200+", "₹50,00,000", "12 Cr",
 * "100%" into a numeric portion to animate plus a static prefix/suffix — so
 * admin-entered values never need special formatting to get the count-up
 * effect, and non-numeric values (e.g. "N/A") just render statically. */
function splitNumericValue(raw: string): { prefix: string; number: number; suffix: string } | null {
  const match = raw.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, numStr, suffix] = match;
  const number = Number(numStr.replace(/,/g, ''));
  if (Number.isNaN(number)) return null;
  return { prefix, number, suffix };
}

export function AnimatedCounter({
  value,
  duration = 1.8,
  className,
}: {
  value: string;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = React.useState<string>(value);
  const parsed = React.useMemo(() => splitNumericValue(value), [value]);

  React.useEffect(() => {
    if (!parsed) {
      setDisplay(value);
      return;
    }
    if (!inView || reducedMotion) {
      setDisplay(value);
      return;
    }

    const { prefix, number, suffix } = parsed;
    const hasDecimal = value.includes('.');
    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = number * eased;
      const formatted = hasDecimal
        ? current.toFixed(1)
        : Math.round(current).toLocaleString('en-IN');
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reducedMotion, parsed, value, duration]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {display}
    </span>
  );
}
