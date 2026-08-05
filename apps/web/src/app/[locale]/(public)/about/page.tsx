import type { Metadata } from 'next';
import { BookOpen, Building2, Eye, Target, User, Wallet } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { TrustBadge } from '@/components/public/trust-badge';
import { getPageContent, getPublicDocuments, getSiteSettings } from '@/lib/public-api';
import { parseAboutBlocks } from '@/lib/about-content';
import { buildMetadata, defaultSeoFields } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const settings = await getSiteSettings();
  const { description, image } = defaultSeoFields(settings);
  const t = await getTranslations('Nav');
  return buildMetadata({
    locale,
    path: '/about',
    title: `${t('about')} — ${settings.siteNameEn}`,
    description,
    image,
  });
}

const LINKS = [
  { key: 'history', href: '/about/history', icon: BookOpen },
  { key: 'vision', href: '/about/vision', icon: Eye },
  { key: 'mission', href: '/about/mission', icon: Target },
  { key: 'founder', href: '/about/founder', icon: User },
  { key: 'committee', href: '/about/committee', icon: Building2 },
  { key: 'treasurer', href: '/about/treasurer', icon: Wallet },
] as const;

export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  const [documents, content] = await Promise.all([
    getPublicDocuments().catch(() => []),
    getPageContent('about'),
  ]);

  const has12A = documents.some((doc) => doc.category === 'certificate_12ab');
  const has80G = documents.some((doc) => doc.category === 'certificate_80g');
  const hasRegistration = documents.some((doc) => doc.category === 'registration_certificate');

  const blocks = parseAboutBlocks(content);
  const aboutHtml = locale === 'te' && blocks.aboutTe ? blocks.aboutTe : blocks.aboutEn;

  return (
    <div>
      <PageHero
        title={t('about')}
        description={settings.taglineEn ?? undefined}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('about') }]}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-wrap gap-2">
          {hasRegistration && <TrustBadge variant="registered-ngo" />}
          {(has12A || has80G) && <TrustBadge variant="tax-exempt" />}
          <TrustBadge variant="secure-payment" />
        </div>

        {aboutHtml && (
          <div className="mb-10 max-w-3xl">
            <RichContent html={aboutHtml} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {LINKS.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="border-pub-neutral-200 hover:border-pub-primary-700 hover:shadow-pub-sm flex flex-col items-center gap-2 rounded-xl border bg-white p-6 text-center transition-all"
            >
              <Icon className="text-pub-primary-700 size-7" />
              <span className="font-pub-heading text-pub-primary-900 text-sm font-semibold">
                {t(key)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
