import type { Metadata } from 'next';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { PremiumButton } from '@/components/public/premium-button';
import { RichContent } from '@/components/public/rich-content';
import { getPageContent, getSiteSettings } from '@/lib/public-api';
import { parseAboutBlocks } from '@/lib/about-content';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/about/founder',
    title: `Our Founder & Leadership | ${settings.siteNameEn}`,
    description: `Meet the founder and leadership team behind ${settings.siteNameEn}.`,
  });
}

export default async function FounderPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tAbout = await getTranslations('About');
  const content = await getPageContent('about');
  const blocks = parseAboutBlocks(content);
  const html = locale === 'te' && blocks.founderBioTe ? blocks.founderBioTe : blocks.founderBioEn;

  return (
    <div>
      <PageHero
        title={tAbout('founderHeroTitle')}
        description={tAbout('founderHeroSubtitle')}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('about'), href: '/about' },
          { label: t('founder') },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="shadow-pub-lg border-pub-neutral-white relative aspect-[4/5] w-44 overflow-hidden rounded-2xl border-4 sm:w-56">
            <Image
              src="/images/real/committee-d-ashok.jpg"
              alt="Sri Debbadi Ashok, Founder President of Sai Yadadri Seva Ashram"
              fill
              sizes="224px"
              className="object-cover object-top"
              priority
            />
          </div>
        </div>
        <RichContent
          html={html}
          className="[&_h2]:border-pub-gold-300/40 [&_h3]:text-pub-gold-700 dark:[&_h3]:text-pub-gold-300 [&_img]:!border-pub-neutral-white [&_img]:!shadow-pub-lg [&_h2]:mt-10 [&_h2]:border-b [&_h2]:pb-2 [&_h2]:first:mt-0 [&_img]:!mx-auto [&_img]:!mt-2 [&_img]:!mb-4 [&_img]:!block [&_img]:!aspect-[4/5] [&_img]:!w-32 [&_img]:!rounded-2xl [&_img]:!border-4 [&_img]:!object-cover [&_img]:!object-top"
        />
        <div className="pub-gradient-emerald mt-16 rounded-[var(--radius-pub-card)] p-8 text-center text-white sm:p-10">
          <h2 className="font-pub-heading text-xl font-semibold sm:text-2xl">
            {tAbout('founderCtaHeading')}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            {tAbout('founderCtaBody')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <PremiumButton render={<Link href="/donate#online-donation" />} tone="gold">
              {tAbout('founderCtaSupport')}
            </PremiumButton>
            <PremiumButton render={<Link href="/volunteer" />} tone="ghost-light">
              {tAbout('founderCtaVolunteer')}
            </PremiumButton>
            <PremiumButton render={<Link href="/contact" />} tone="ghost-light">
              {tAbout('founderCtaVisit')}
            </PremiumButton>
          </div>
        </div>
      </div>
    </div>
  );
}
