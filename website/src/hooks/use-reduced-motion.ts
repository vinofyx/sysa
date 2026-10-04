'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks the user's `prefers-reduced-motion` OS/browser setting.
 * Every Framer Motion animation added in the UI-implementation phase must
 * consult this hook and fall back to instant/near-instant transitions —
 * a hard requirement, not optional polish (design/09-Animation-Specifications.md §3).
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
}
