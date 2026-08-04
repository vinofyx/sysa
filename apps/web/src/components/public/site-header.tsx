import Image from 'next/image';
import NextLink from 'next/link';
import { Search } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/public/language-switcher';
import { MobileMenu } from '@/components/public/mobile-menu';
import type { NavItem, SiteSettings } from '@/types/public';

interface SiteHeaderProps {
  settings: SiteSettings;
  navItems: NavItem[];
}

/** Public site header — real navigation sourced from the CMS (Navigation
 * Menus module), not a hardcoded link list (design/01-Information-Architecture.md
 * §4, design/07-Component-Library.md `StickyHeader`). */
export async function SiteHeader({ settings, navItems }: SiteHeaderProps) {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');

  const siteName =
    locale === 'te' && settings.siteNameTe ? settings.siteNameTe : settings.siteNameEn;

  return (
    <header className="border-pub-neutral-200 bg-pub-neutral-white/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={siteName}
              width={36}
              height={36}
              className="size-9 rounded-md object-contain"
            />
          ) : null}
          <span className="font-pub-heading text-pub-primary-900 text-base leading-tight">
            {siteName}
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.url}
              className="text-pub-neutral-900 hover:text-pub-primary-700 text-sm font-medium transition-colors"
            >
              {locale === 'te' && item.labelTe ? item.labelTe : item.labelEn}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            aria-label={t('search')}
            className="text-pub-neutral-500 hover:text-pub-primary-700"
          >
            <Search className="size-4" />
          </Link>
          <LanguageSwitcher className="text-pub-neutral-900 hidden sm:inline-flex" />
          <Button
            render={<Link href="/donate" />}
            className="bg-pub-primary-700 hover:bg-pub-primary-500 hidden sm:inline-flex"
          >
            {tCommon('donateNow')}
          </Button>
          <NextLink
            href="/login"
            className="text-pub-neutral-500 hover:text-pub-primary-700 hidden text-xs font-medium lg:inline-flex"
          >
            {t('adminLogin')}
          </NextLink>
          <MobileMenu items={navItems} />
        </div>
      </div>
    </header>
  );
}
