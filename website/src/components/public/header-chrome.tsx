'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { MobileMenu } from '@/components/public/mobile-menu';
import { PremiumButton } from '@/components/public/premium-button';
import { ThemeToggle } from '@/components/public/theme-toggle';
import { cn } from '@/lib/utils';
import { resolveNavLabel } from '@/lib/nav-labels';
import type { NavItem, SiteSettings } from '@/types/public';

interface HeaderChromeProps {
  settings: SiteSettings;
  navItems: NavItem[];
  siteName: string;
  locale: string;
  labels: {
    search: string;
    donateNow: string;
  };
}

/**
 * Client-side chrome for the sticky header: an always-solid premium
 * ivory/charcoal surface (`.pub-header-surface`, public.css) on the
 * homepage — it sits directly over the full-bleed hero photo, so it needs
 * to read as an intentional, opaque bar rather than a see-through tint —
 * and the standard `.pub-glass` bar everywhere else, where pages use the
 * shorter `PageHero` banner instead of a hero image. Both branches use the
 * same theme-driven text colors; neither depends on scroll position
 * anymore. Server parent (`site-header.tsx`) still owns all data fetching
 * (nav items, settings) and locale/translation resolution.
 */
export function HeaderChrome({ settings, navItems, siteName, locale, labels }: HeaderChromeProps) {
  const tNav = useTranslations('Nav');
  const pathname = usePathname();
  // Static export runs with `trailingSlash: true` (next.config.ts), so
  // `usePathname()` returns e.g. "/about/" while nav item URLs from content
  // are stored without one ("/about") — comparing them raw meant the active
  // underline never lit up for anything but "/". Normalize once here.
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const isHome = pathname === '/';

  // No border-radius here deliberately — each usage site sets its own
  // (rounded-full for circular icon buttons, rounded-md for text links) so
  // the focus ring always matches the element's actual shape.
  const navLinkFocus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pub-gold-500/60 focus-visible:ring-offset-2';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-300',
        isHome
          ? 'pub-header-surface'
          : 'pub-glass border-pub-neutral-200/60 shadow-pub-sm border-b',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:h-[70px] sm:px-6 lg:h-[76px] lg:px-10">
        <Link
          href="/"
          className={cn(
            'flex min-w-0 items-center gap-2.5 rounded-md',
            navLinkFocus,
            'focus-visible:ring-offset-0',
          )}
        >
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={siteName}
              width={40}
              height={40}
              className="size-9 shrink-0 rounded-full object-contain ring-1 ring-black/5 sm:size-10"
            />
          ) : null}
          <span className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 truncate text-[15px] leading-tight font-semibold tracking-tight sm:text-lg lg:text-xl">
            {siteName}
          </span>
        </Link>

        {/* `xl:flex` rather than `lg:flex`: at exactly 1024px the 7 nav
            links (~540px) plus the logo (~262px) and right-cluster controls
            (~240px) exceed the available header width, causing horizontal
            overflow. Below `xl`, `MobileMenu`'s hamburger trigger covers
            navigation instead. */}
        <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
          {navItems.map((item) => {
            const label = resolveNavLabel(item, locale, tNav);
            const isActive = normalizedPathname === item.url;
            return (
              <Link
                key={item.id}
                href={item.url}
                className={cn(
                  // Text color is intentionally constant (dark charcoal in
                  // light mode, ivory-to-white in dark mode) across normal,
                  // hover, and active states — gold is reserved entirely for
                  // the underline below. Only font-weight shifts on
                  // hover/active, so the active item is never gold/orange.
                  'group relative rounded-md px-3.5 py-2 text-sm tracking-wide text-[#26352D] transition-colors duration-200 dark:text-[#F5F3EA]',
                  navLinkFocus,
                  isActive ? 'font-semibold' : 'font-medium hover:font-semibold',
                )}
              >
                {label}
                <span
                  className={cn(
                    'pub-gradient-gold absolute bottom-1 left-1/2 h-[2px] w-8 origin-center -translate-x-1/2 scale-x-0 rounded-full transition-transform duration-200 ease-out group-hover:scale-x-100',
                    isActive && 'scale-x-100',
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/search"
            aria-label={labels.search}
            className={cn(
              'hidden size-10 items-center justify-center rounded-full transition-colors duration-200 sm:inline-flex',
              navLinkFocus,
              'text-pub-neutral-500 hover:bg-pub-gold-100 hover:text-pub-gold-700 dark:hover:bg-pub-gold-800/20 dark:hover:text-pub-gold-300',
            )}
          >
            <Search className="size-4" />
          </Link>
          <ThemeToggle
            className={cn(
              'inline-flex size-10 transition-colors duration-200',
              'hover:bg-pub-gold-100 hover:text-pub-gold-700 dark:hover:bg-pub-gold-800/20 dark:hover:text-pub-gold-300',
            )}
          />
          <PremiumButton
            render={<Link href="/donate#online-donation" />}
            size="sm"
            className="hidden h-[42px] text-sm sm:inline-flex"
          >
            {labels.donateNow}
          </PremiumButton>
          <MobileMenu items={navItems} />
        </div>
      </div>
    </header>
  );
}
