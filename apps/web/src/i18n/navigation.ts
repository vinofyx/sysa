import { createNavigation } from 'next-intl/navigation';

import { routing } from '@/i18n/routing';

/** Locale-aware `Link`/`redirect`/`usePathname`/`useRouter` — always use these
 * (not the plain `next/link`/`next/navigation`) inside the public site so
 * links keep the current locale prefix automatically. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
