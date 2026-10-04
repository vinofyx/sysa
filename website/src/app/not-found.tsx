import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Playfair_Display, Inter, Noto_Sans_Telugu } from 'next/font/google';
import { FileQuestion } from 'lucide-react';

import { FloatingSocialButtons } from '@/components/public/floating-social-buttons';
import { SiteFooter } from '@/components/public/site-footer';
import { SiteHeader } from '@/components/public/site-header';
import { StatusPage } from '@/components/shared/status-page';
import { getNavigation, getSiteSettings, getSocialLinks } from '@/lib/public-api';

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

/**
 * The 404 boundary for any URL that doesn't match a real route at all (as
 * opposed to a page inside (public) calling `notFound()` for a missing
 * record, e.g. an unknown activity slug — that renders inside the normal
 * (public) layout already). This one sits outside every route group, so a
 * lost visitor previously landed on a bare icon + message with no header,
 * navigation, or footer — a dead end with only a single "Go home" link.
 * Rebuilding the same header/footer chrome here (mirroring
 * (public)/layout.tsx) keeps full site navigation, Donate Now, and contact
 * info available even on a mistyped or stale URL.
 */
export default async function NotFound() {
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
        <main className="flex-1 overflow-x-clip">
          <StatusPage
            icon={FileQuestion}
            title="Page not found"
            description="The page you're looking for doesn't exist or may have been moved."
            actionLabel="Go home"
            actionHref="/"
            className="min-h-[60vh]"
          />
        </main>
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
