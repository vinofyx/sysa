import { SiteFooter } from '@/components/public/site-footer';
import { SiteHeader } from '@/components/public/site-header';
import { WhatsAppFab } from '@/components/public/whatsapp-fab';
import { getNavigation, getSiteSettings, getSocialLinks } from '@/lib/public-api';

/** Every public page depends on live CMS data (header/footer nav, site
 * settings, and each page's own content) that can change at any time via the
 * admin panel — rendered per-request rather than statically generated, so
 * content edits are reflected immediately without a rebuild/redeploy. This
 * also means `next build` never needs a live backend reachable at build time
 * (consistent with every prior phase's "no live database in this build
 * environment" constraint — see DEVELOPMENT_PROGRESS.md). */
export const dynamic = 'force-dynamic';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, navigation, socialLinks] = await Promise.all([
    getSiteSettings(),
    getNavigation(),
    getSocialLinks(),
  ]);

  return (
    <>
      <SiteHeader settings={settings} navItems={navigation.header} />
      <main className="flex-1">{children}</main>
      <SiteFooter
        settings={settings}
        footerNavItems={navigation.footer}
        socialLinks={socialLinks}
      />
      <WhatsAppFab whatsappNumber={settings.whatsappNumber} />
    </>
  );
}
