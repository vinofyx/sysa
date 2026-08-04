import { Globe, Mail, MessageCircle, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { NewsletterForm } from '@/components/public/newsletter-form';
import type { NavItem, SiteSettings, SocialLink } from '@/types/public';

interface SiteFooterProps {
  settings: SiteSettings;
  footerNavItems: NavItem[];
  socialLinks: SocialLink[];
}

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

  return (
    <footer className="bg-pub-primary-900 mt-auto text-white/80">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-pub-heading text-lg font-semibold text-white">{siteName}</p>
          {footerText && <p className="mt-2 text-sm">{footerText}</p>}
          {address && <p className="mt-3 text-sm">{address}</p>}
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t('quickLinks')}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {footerNavItems.map((item) => (
              <li key={item.id}>
                <Link href={item.url} className="hover:text-white">
                  {locale === 'te' && item.labelTe ? item.labelTe : item.labelEn}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t('contactUs')}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {settings.contactPhone && (
              <li className="flex items-center gap-2">
                <Phone className="size-3.5 shrink-0" /> {settings.contactPhone}
              </li>
            )}
            {settings.contactEmail && (
              <li className="flex items-center gap-2">
                <Mail className="size-3.5 shrink-0" /> {settings.contactEmail}
              </li>
            )}
            {settings.whatsappNumber && (
              <li className="flex items-center gap-2">
                <MessageCircle className="size-3.5 shrink-0" /> {settings.whatsappNumber}
              </li>
            )}
          </ul>
          {socialLinks.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold text-white">{t('followUs')}</p>
              <div className="mt-2 flex gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={PLATFORM_LABEL[link.platform]}
                    className="hover:text-pub-gold-500"
                  >
                    <Globe className="size-4" />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{tHome('newsletterHeading')}</p>
          <p className="mt-2 text-sm">{tHome('newsletterBody')}</p>
          <NewsletterForm className="mt-3" />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:flex-row sm:px-6 lg:px-8">
          <p>
            &copy; {new Date().getFullYear()} {siteName}. {t('rightsReserved')}
          </p>
          <nav className="flex flex-wrap gap-4">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.key} href={link.href} className="hover:text-white">
                {tLegal(link.key)}
              </Link>
            ))}
          </nav>
          <p>{t('regdNo')}: 423/2019</p>
        </div>
      </div>
    </footer>
  );
}
