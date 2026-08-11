'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PremiumButtonProps = React.ComponentProps<typeof Button> & {
  tone?: 'gold' | 'emerald' | 'ghost-light';
};

/**
 * Public-site-only premium CTA button — gold/emerald gradient, hover glow +
 * lift, built on top of the shared `ui/button.tsx` primitive (so focus
 * states, disabled states, and the `render` prop polymorphism all keep
 * working) without touching that shared file, which the admin CMS also uses.
 */
export function PremiumButton({
  className,
  tone = 'gold',
  size = 'lg',
  nativeButton = false,
  ...props
}: PremiumButtonProps) {
  return (
    <Button
      size={size}
      // Every call site renders this as a `Link` via the `render` prop, not
      // a plain <button> — nativeButton defaults to false so Base UI doesn't
      // warn that it expected native button semantics on an anchor element.
      nativeButton={nativeButton}
      className={cn(
        'relative overflow-hidden rounded-full border-0 px-6 font-semibold shadow-[0_8px_24px_-8px_rgba(200,155,60,0.55)] transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-8px_rgba(200,155,60,0.65)] active:translate-y-0',
        'before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full',
        tone === 'gold' && 'pub-gradient-gold text-pub-primary-950',
        tone === 'emerald' &&
          'pub-gradient-emerald text-white shadow-[0_8px_24px_-8px_rgba(15,81,50,0.55)] hover:shadow-[0_14px_32px_-8px_rgba(15,81,50,0.65)]',
        tone === 'ghost-light' &&
          'border border-white/70 bg-white/10 text-white shadow-none backdrop-blur-sm hover:bg-white/20 hover:shadow-none',
        className,
      )}
      {...props}
    />
  );
}
