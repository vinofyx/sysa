import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { VolunteerForm } from '@/components/public/volunteer-form';
import { getSiteSettings } from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Volunteer');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/volunteer',
    title: `${t('heading')} — ${settings.siteNameEn}`,
    description: t('subheading'),
  });
}

export default async function VolunteerPage() {
  const t = await getTranslations('Nav');
  const tVolunteer = await getTranslations('Volunteer');

  return (
    <div>
      <PageHero
        title={t('volunteer')}
        description={tVolunteer('subheading')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('volunteer') }]}
      />
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <VolunteerForm />
      </div>
    </div>
  );
}
