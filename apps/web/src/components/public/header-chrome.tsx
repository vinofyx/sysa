'use client';

import * as React from 'react';
import Image from 'next/image';
import NextLink from 'next/link';
import { Search, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/public/language-switcher';
import { MobileMenu } from '@/components/public/mobile-menu';
import { PremiumButton } from '@/components/public/premium-button';
import { cn } from '@/lib/utils';
import type { NavItem, SiteSettings } from '@/types/public';

interface HeaderChromeProps {
  settings: SiteSettings;
  navItems: NavItem[];
  siteName: string;
  locale: string;
  labels: {
    search: string;
    donateNow: string;
    adminLogin: string;
  };
}

/**
 * Client-side chrome for the sticky header: transparent-glass-over-hero on
 * the homepage (fades to a solid glass bar on scroll), a permanent solid
 * glass bar everywhere else — inner pages use the shorter `PageHero` banner,
 * not a full-bleed image, so a transparent header would sit on plain
 * background there. Server parent (`site-header.tsx`) still owns all data
 * fetching (nav items, settings) and locale/translation resolution.
 */
export function HeaderChrome({ settings, navItems, siteName, locale, labels }: HeaderChromeProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const transparent = isHome && !scrolled;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-500',
        transparent
          ? 'border-b border-white/10 bg-transparent'
          : 'pub-glass border-pub-neutral-200/80 border-b shadow-[0_1px_0_rgba(0,0,0,0.02)]',
      )}
    >
      <div className="mx-auto flex h-18 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={siteName}
              width={40}
              height={40}
              className="size-10 rounded-full object-contain ring-1 ring-black/5"
            />
          ) : null}
          <span
            className={cn(
              'font-pub-heading text-base leading-tight font-semibold tracking-tight transition-colors sm:text-lg',
              transparent ? 'text-white' : 'text-pub-primary-900',
            )}
          >
            {siteName}
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {navItems.map((item) => {
            const label = locale === 'te' && item.labelTe ? item.labelTe : item.labelEn;
            const isActive = pathname === item.url;
            return (
              <Link
                key={item.id}
                href={item.url}
                className={cn(
                  'group relative px-3.5 py-2 text-sm font-medium tracking-wide transition-colors',
                  transparent
                    ? 'text-white/90 hover:text-white'
                    : 'text-pub-neutral-700 hover:text-pub-primary-800',
                )}
              >
                {label}
                <span
                  className={cn(
                    'pub-gradient-gold absolute right-3.5 bottom-1 left-3.5 h-[2px] origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-x-100',
                    isActive && 'scale-x-100',
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <Link
            href="/search"
            aria-label={labels.search}
            className={cn(
              'hidden transition-colors sm:inline-flex',
              transparent
                ? 'text-white/80 hover:text-white'
                : 'text-pub-neutral-500 hover:text-pub-primary-700',
            )}
          >
            <Search className="size-4" />
          </Link>
          <LanguageSwitcher
            className={cn(
              'hidden transition-colors sm:inline-flex',
              transparent ? 'text-white/90 hover:text-white' : 'text-pub-neutral-700',
            )}
          />
          <PremiumButton
            render={<Link href="/donate" />}
            size="sm"
            className="hidden sm:inline-flex"
          >
            {labels.donateNow}
          </PremiumButton>
          <NextLink
            href="/login"
            className={cn(
              'hidden items-center gap-1.5 text-xs font-medium transition-colors lg:inline-flex',
              transparent
                ? 'text-white/75 hover:text-white'
                : 'text-pub-neutral-500 hover:text-pub-primary-700',
            )}
          >
            <ShieldCheck className="size-3.5" />
            {labels.adminLogin}
          </NextLink>
          <MobileMenu items={navItems} />
        </div>
      </div>

      {transparent && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/10 to-transparent"
        />
      )}
    </header>
  );
}
