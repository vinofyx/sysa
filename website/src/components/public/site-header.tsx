import { getLocale, getTranslations } from 'next-intl/server';

import { HeaderChrome } from '@/components/public/header-chrome';
import type { NavItem, SiteSettings } from '@/types/public';

interface SiteHeaderProps {
  settings: SiteSettings;
  navItems: NavItem[];
}

/** Public site header — real navigation sourced from the CMS (Navigation
 * Menus module), not a hardcoded link list (design/01-Information-Architecture.md
 * §4, design/07-Component-Library.md `StickyHeader`). Data-fetching stays in
 * this Server Component; scroll-aware glass/transparency and the animated
 * nav underline live in the client-only `HeaderChrome`. */
export async function SiteHeader({ settings, navItems }: SiteHeaderProps) {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');

  const siteName =
    locale === 'te' && settings.siteNameTe ? settings.siteNameTe : settings.siteNameEn;

  return (
    <HeaderChrome
      settings={settings}
      navItems={navItems}
      siteName={siteName}
      locale={locale}
      labels={{
        search: t('search'),
        donateNow: tCommon('donateNow'),
      }}
    />
  );
}
