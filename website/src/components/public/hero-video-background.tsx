'use client';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * Persistent looping video backdrop for the homepage Hero — sits behind the
 * banner carousel's text/CTA slides (see hero-banner.tsx) rather than each
 * slide carrying its own photo, so the video plays continuously while the
 * title/subtitle/CTA content keeps cycling on top of it.
 *
 * A client component (not just a plain `<video>` in the server-rendered
 * hero) only because `prefers-reduced-motion` respect requires it — every
 * other motion in this codebase already goes through this same hook
 * (design/09-Animation-Specifications.md §3). Reduced-motion visitors get a
 * static first frame instead of an autoplaying, looping video.
 */
export function HeroVideoBackground({ poster }: { poster?: string }) {
  const reducedMotion = useReducedMotion();

  return (
    <video
      className="absolute inset-0 size-full object-cover"
      src="/videos/hero.mp4"
      poster={poster}
      autoPlay={!reducedMotion}
      loop={!reducedMotion}
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}
