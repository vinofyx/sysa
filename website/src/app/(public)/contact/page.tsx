import type { Metadata } from 'next';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { ContactForm } from '@/components/public/contact-form';
import { JsonLd } from '@/components/public/json-ld';
import { getPageContent, getSiteSettings } from '@/lib/public-api';
import { buildMetadata, defaultSeoFields } from '@/lib/seo';
import { env } from '@/lib/env';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const settings = await getSiteSettings();
  const { description } = defaultSeoFields(settings, locale);
  const t = await getTranslations('Contact');
  return buildMetadata({
    locale,
    path: '/contact',
    title: `${t('heading')} — ${settings.siteNameEn}`,
    description,
  });
}

function parseIntro(
  content: { blocksEn: Record<string, unknown>; blocksTe: Record<string, unknown> | null },
  locale: string,
): string {
  const introEn = typeof content.blocksEn.introEn === 'string' ? content.blocksEn.introEn : '';
  const introTe =
    typeof content.blocksTe?.introEn === 'string' ? (content.blocksTe.introEn as string) : '';
  return locale === 'te' && introTe ? introTe : introEn;
}

export default async function ContactPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tContact = await getTranslations('Contact');
  const [settings, content] = await Promise.all([getSiteSettings(), getPageContent('contact')]);

  const intro = parseIntro(content, locale);
  const address =
    locale === 'te' && settings.contactAddressTe
      ? settings.contactAddressTe
      : settings.contactAddressEn;
  const hasMap = settings.mapLatitude && settings.mapLongitude;

  return (
    <div>
      {settings.mapLatitude && settings.mapLongitude && settings.contactAddressEn && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: settings.siteNameEn,
            address: { '@type': 'PostalAddress', streetAddress: settings.contactAddressEn },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: settings.mapLatitude,
              longitude: settings.mapLongitude,
            },
            telephone: settings.contactPhone ?? undefined,
            email: settings.contactEmail ?? undefined,
            url: `${env.NEXT_PUBLIC_SITE_URL}/contact`,
          }}
        />
      )}
      <PageHero
        title={tContact('heading')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('contact') }]}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            {intro && (
              <div className="mb-6">
                <RichContent html={intro} />
              </div>
            )}
            <ContactForm />
          </div>

          <div className="flex flex-col gap-6">
            <div className="border-pub-neutral-200 bg-pub-neutral-white flex flex-col gap-3 rounded-xl border p-6 text-sm">
              {address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="text-pub-primary-700 dark:text-pub-gold-300 mt-0.5 size-4 shrink-0" />
                  <span>{address}</span>
                </div>
              )}
              {settings.contactPhone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="text-pub-primary-700 dark:text-pub-gold-300 size-4 shrink-0" />
                  <a href={`tel:${settings.contactPhone}`} className="hover:underline">
                    {settings.contactPhone}
                  </a>
                </div>
              )}
              {settings.contactEmail && (
                <div className="flex items-center gap-2.5">
                  <Mail className="text-pub-primary-700 dark:text-pub-gold-300 size-4 shrink-0" />
                  <a href={`mailto:${settings.contactEmail}`} className="hover:underline">
                    {settings.contactEmail}
                  </a>
                </div>
              )}
              {settings.whatsappNumber && (
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="text-pub-primary-700 dark:text-pub-gold-300 size-4 shrink-0" />
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {settings.whatsappNumber}
                  </a>
                </div>
              )}
              {settings.contactHoursEn && (
                <div className="flex items-center gap-2.5">
                  <Clock className="text-pub-primary-700 dark:text-pub-gold-300 size-4 shrink-0" />
                  <span>{settings.contactHoursEn}</span>
                </div>
              )}
            </div>

            {hasMap && (
              <div className="border-pub-neutral-200 aspect-video overflow-hidden rounded-xl border">
                <iframe
                  title={tContact('mapTitle')}
                  src={`https://www.google.com/maps?q=${settings.mapLatitude},${settings.mapLongitude}&output=embed`}
                  className="size-full border-0"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
