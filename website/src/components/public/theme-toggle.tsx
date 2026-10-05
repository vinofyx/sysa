'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Public-site light/dark toggle — a plain click-to-flip icon button, unlike
 * the admin's light/dark/system dropdown (components/admin/theme-switcher.tsx):
 * visitors don't need a "system" option surfaced, just a fast way to switch.
 * Reuses `next-themes`' existing global provider (components/providers/theme-provider.tsx)
 * — no new state, no new dependency. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('Common');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoids a hydration mismatch: the real (possibly system-derived) theme is
  // only known client-side, same guard as the admin theme switcher.
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('switchToLightTheme') : t('switchToDarkTheme')}
      className={cn(
        'text-pub-neutral-500 hover:text-pub-primary-700 dark:hover:text-pub-gold-300 inline-flex size-9 items-center justify-center rounded-full transition-colors',
        className,
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-[18px]" />
        ) : (
          <Moon className="size-[18px]" />
        )
      ) : (
        <span className="block size-[18px]" aria-hidden />
      )}
    </button>
  );
}
