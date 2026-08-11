import type { Metadata } from 'next';
import { BookOpen, Building2, Eye, Target, User, Wallet } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { TrustBadge } from '@/components/public/trust-badge';
import { Reveal } from '@/components/public/motion';
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

      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal className="mb-10 flex flex-wrap gap-2.5">
          {hasRegistration && <TrustBadge variant="registered-ngo" />}
          {(has12A || has80G) && <TrustBadge variant="tax-exempt" />}
          <TrustBadge variant="secure-payment" />
        </Reveal>

        {aboutHtml && (
          <Reveal className="mb-16 max-w-3xl">
            <RichContent html={aboutHtml} />
          </Reveal>
        )}

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {LINKS.map(({ key, href, icon: Icon }, index) => (
            <Reveal key={key} delay={index * 0.06}>
              <Link
                href={href}
                className="border-pub-neutral-200/70 shadow-pub-sm hover:shadow-pub-lg group relative flex h-full flex-col items-center gap-3 overflow-hidden rounded-[var(--radius-pub-card)] border bg-white p-7 text-center transition-all duration-500 hover:-translate-y-1.5"
              >
                <span className="pub-gradient-gold absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />
                <span className="bg-pub-primary-100 text-pub-primary-700 group-hover:pub-gradient-gold flex size-14 items-center justify-center rounded-full transition-colors duration-300 group-hover:text-white">
                  <Icon className="size-6" />
                </span>
                <span className="font-pub-heading text-pub-primary-950 text-base font-semibold">
                  {t(key)}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
