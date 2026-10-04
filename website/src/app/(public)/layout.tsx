import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Playfair_Display, Inter, Noto_Sans_Telugu } from 'next/font/google';

import { FloatingSocialButtons } from '@/components/public/floating-social-buttons';
import { SiteFooter } from '@/components/public/site-footer';
import { SiteHeader } from '@/components/public/site-header';
import { getNavigation, getSiteSettings, getSocialLinks } from '@/lib/public-api';

import '../public.css';

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

/** Every public page depends on live CMS data (header/footer nav, site
 * settings, and each page's own content) that can change at any time via the
 * admin panel — rendered per-request rather than statically generated, so
 * content edits are reflected immediately without a rebuild/redeploy. This
 * also means `next build` never needs a live backend reachable at build time
 * (consistent with every prior phase's "no live database in this build
 * environment" constraint — see DEVELOPMENT_PROGRESS.md). */
export const dynamic = 'force-dynamic';

/**
 * Public-site-only wrapper — the admin CMS/auth flows (Phase 4/5) live
 * outside this route group entirely and keep the Geist fonts from the true
 * root layout (`src/app/layout.tsx`); this layout only ever wraps `(public)`
 * pages, applying the design system's Playfair Display/Inter/Noto Sans Telugu
 * type families (design/06-Design-System.md) scoped to a `lang`-tagged
 * wrapper rather than the `<html>` tag itself, since only one layout in the
 * tree may render `<html>`/`<body>` and that one is shared with /admin and
 * /login.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, navigation, socialLinks, messages] = await Promise.all([
    getSiteSettings(),
    getNavigation(),
    getSocialLinks(),
    getMessages(),
  ]);

  return (
    <div
      lang="en"
      dir="ltr"
      className={`${playfairDisplay.variable} ${inter.variable} ${notoSansTelugu.variable} font-public flex min-h-screen flex-col`}
    >
      <NextIntlClientProvider locale="en" messages={messages}>
        <SiteHeader settings={settings} navItems={navigation.header} />
        {/* overflow-x-clip: Reveal's slide-left/slide-right variants (components/public/motion.tsx)
            translateX their element 36px off its resting position before it scrolls into view —
            harmless while off-canvas, but without a clipping ancestor that translated width adds
            real horizontal scroll to the whole page for any such section still below the fold. */}
        <main className="flex-1 overflow-x-clip">{children}</main>
        <SiteFooter
          settings={settings}
          footerNavItems={navigation.footer}
          socialLinks={socialLinks}
        />
        <FloatingSocialButtons
          whatsappNumber={settings.whatsappNumber}
          contactEmail={settings.contactEmail}
          socialLinks={socialLinks}
        />
      </NextIntlClientProvider>
    </div>
  );
}
