import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Playfair_Display, Inter, Noto_Sans_Telugu } from 'next/font/google';

import { routing } from '@/i18n/routing';

import './public.css';

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const notoSansTelugu = Noto_Sans_Telugu({
  variable: '--font-noto-telugu',
  subsets: ['telugu'],
  weight: ['400', '500', '600', '700'],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Public-site-only locale root — the admin CMS/auth flows (Phase 4/5) live
 * outside this segment entirely and keep the Geist fonts from the true root
 * layout (`src/app/layout.tsx`); this layout only ever wraps `(public)`
 * pages, applying the design system's Playfair Display/Inter/Noto Sans Telugu type
 * families (design/06-Design-System.md) scoped to a `lang`-tagged wrapper
 * rather than the `<html>` tag itself, since only one layout in the tree may
 * render `<html>`/`<body>` and that one is shared with /admin and /login.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <div
      lang={locale}
      dir="ltr"
      className={`${playfairDisplay.variable} ${inter.variable} ${notoSansTelugu.variable} font-public flex min-h-screen flex-col`}
    >
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </div>
  );
}
