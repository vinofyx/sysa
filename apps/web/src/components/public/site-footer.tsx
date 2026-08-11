import { Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { NewsletterForm } from '@/components/public/newsletter-form';
import type { NavItem, SiteSettings, SocialLink } from '@/types/public';

interface SiteFooterProps {
  settings: SiteSettings;
  footerNavItems: NavItem[];
  socialLinks: SocialLink[];
}

/** lucide-react no longer ships brand/logo glyphs (trademark policy), so
 * every platform shares the same generic globe/chat icon — matching the
 * pre-redesign behavior rather than guessing at misleading brand stand-ins. */
const PLATFORM_ICON: Record<SocialLink['platform'], typeof Globe> = {
  facebook: Globe,
  instagram: Globe,
  twitter: Globe,
  youtube: Globe,
  linkedin: Globe,
  whatsapp: MessageCircle,
};

const PLATFORM_LABEL: Record<SocialLink['platform'], string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
};

const LEGAL_LINKS = [
  { key: 'privacyPolicy', href: '/privacy-policy' },
  { key: 'termsConditions', href: '/terms-conditions' },
  { key: 'refundPolicy', href: '/refund-policy' },
  { key: 'disclaimer', href: '/disclaimer' },
] as const;

export async function SiteFooter({ settings, footerNavItems, socialLinks }: SiteFooterProps) {
  const locale = await getLocale();
  const t = await getTranslations('Footer');
  const tLegal = await getTranslations('Legal');
  const tHome = await getTranslations('Home');

  const siteName =
    locale === 'te' && settings.siteNameTe ? settings.siteNameTe : settings.siteNameEn;
  const footerText =
    locale === 'te' && settings.footerTextTe ? settings.footerTextTe : settings.footerTextEn;
  const address =
    locale === 'te' && settings.contactAddressTe
      ? settings.contactAddressTe
      : settings.contactAddressEn;
  const hasMap = settings.mapLatitude && settings.mapLongitude;

  return (
    <footer className="pub-gradient-emerald relative mt-auto text-white/75">
      <div className="pub-gradient-gold absolute inset-x-0 top-0 h-[3px]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-4 py-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-8 lg:px-8">
        <div>
          <p className="font-pub-heading text-xl font-semibold text-white">{siteName}</p>
          <span className="pub-divider-gold mt-3" />
          {footerText && <p className="mt-4 text-sm leading-relaxed">{footerText}</p>}
          {address && (
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-white/70">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--color-pub-gold-300)]" />
              {address}
            </p>
          )}
          {hasMap && (
            <div className="mt-4 aspect-[16/10] overflow-hidden rounded-2xl border border-white/15 shadow-lg">
              <iframe
                title="Ashram location"
                src={`https://www.google.com/maps?q=${settings.mapLatitude},${settings.mapLongitude}&output=embed`}
                className="size-full grayscale-[30%]"
                loading="lazy"
              />
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-pub-gold-300)] uppercase">
            {t('quickLinks')}
          </p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm">
            {footerNavItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.url}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-pub-gold-300)]"
                >
                  {locale === 'te' && item.labelTe ? item.labelTe : item.labelEn}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-pub-gold-300)] uppercase">
            {t('contactUs')}
          </p>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {settings.contactPhone && (
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-[var(--color-pub-gold-300)]" />
                {settings.contactPhone}
              </li>
            )}
            {settings.contactEmail && (
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-[var(--color-pub-gold-300)]" />
                {settings.contactEmail}
              </li>
            )}
            {settings.whatsappNumber && (
              <li className="flex items-center gap-2.5">
                <MessageCircle className="size-4 shrink-0 text-[var(--color-pub-gold-300)]" />
                {settings.whatsappNumber}
              </li>
            )}
          </ul>
          {socialLinks.length > 0 && (
            <>
              <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[var(--color-pub-gold-300)] uppercase">
                {t('followUs')}
              </p>
              <div className="mt-3 flex gap-2.5">
                {socialLinks.map((link) => {
                  const Icon = PLATFORM_ICON[link.platform];
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={PLATFORM_LABEL[link.platform]}
                      className="hover:text-pub-primary-950 flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-all hover:-translate-y-0.5 hover:border-transparent hover:bg-[var(--color-pub-gold-500)]"
                    >
                      <Icon className="size-4" />
                    </a>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-pub-gold-300)] uppercase">
            {tHome('newsletterHeading')}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{tHome('newsletterBody')}</p>
          <NewsletterForm className="mt-4" />
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-white/60 sm:flex-row sm:px-6 lg:px-8">
          <p>
            &copy; {new Date().getFullYear()} {siteName}. {t('rightsReserved')}
          </p>
          <nav className="flex flex-wrap justify-center gap-4">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.key} href={link.href} className="transition-colors hover:text-white">
                {tLegal(link.key)}
              </Link>
            ))}
          </nav>
          <p className="text-white/50">{t('regdNo')}: 423/2019</p>
        </div>
      </div>
    </footer>
  );
}
