import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { getPageContent, getSiteSettings } from '@/lib/public-api';
import { buildMetadata, localizedDefaultDescription } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Legal');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/terms-conditions',
    title: `${t('termsConditions')} — ${settings.siteNameEn}`,
    description: localizedDefaultDescription(settings, locale),
  });
}

export default async function TermsConditionsPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tLegal = await getTranslations('Legal');
  const content = await getPageContent('terms-conditions');
  const bodyEn = typeof content.blocksEn.bodyEn === 'string' ? content.blocksEn.bodyEn : '';
  const bodyTe =
    typeof (content.blocksTe as Record<string, unknown> | null)?.bodyEn === 'string'
      ? ((content.blocksTe as Record<string, unknown>).bodyEn as string)
      : '';
  const body = locale === 'te' && bodyTe ? bodyTe : bodyEn;

  return (
    <div>
      <PageHero
        title={tLegal('termsConditions')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: tLegal('termsConditions') }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <RichContent html={body} />
      </div>
    </div>
  );
}
