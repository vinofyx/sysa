import type { NavItem } from '@/types/public';

/**
 * Site navigation (header + footer quick links) is CMS-driven — admins can
 * add/reorder/rename entries via the Navigation Menus module — but the
 * current dataset has never had `labelTe` filled in for any entry, even
 * though every URL here points at one of this site's own standard sections.
 * Rather than show raw `labelEn` in Telugu mode for these known routes, fall
 * back to the app's own `Nav` translation dictionary (already used for the
 * exact same concepts elsewhere, e.g. breadcrumbs) before finally falling
 * back to the CMS English label for any URL this map doesn't recognize
 * (custom/one-off menu entries an admin might add later).
 */
const NAV_KEY_BY_URL: Record<string, string> = {
  '/': 'home',
  '/about': 'about',
  '/activities': 'activities',
  '/events': 'events',
  '/news': 'news',
  '/gallery': 'gallery',
  '/contact': 'contact',
  '/volunteer': 'volunteer',
  '/testimonials': 'testimonials',
  '/donate': 'donate',
  '/services': 'services',
};

export function resolveNavLabel(
  item: Pick<NavItem, 'url' | 'labelEn' | 'labelTe'>,
  locale: string,
  t: (key: string) => string,
): string {
  if (locale !== 'te') return item.labelEn;
  if (item.labelTe) return item.labelTe;
  const key = NAV_KEY_BY_URL[item.url];
  return key ? t(key) : item.labelEn;
}
