'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Wraps `next-themes` so the rest of the app never imports it directly.
 * `attribute="class"` toggles Tailwind's `dark:` variant via a class on <html>,
 * matching the CSS variable theme tokens shadcn/ui generated in globals.css.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  );
}
