import type { Metadata } from 'next';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
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
    path: '/about/vision',
    title: `Our Vision | ${settings.siteNameEn}`,
    description: `Our vision for the care of poor elderly people, education and healthcare support in the communities we serve.`,
  });
}

export default async function VisionPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const content = await getPageContent('about');
  const blocks = parseAboutBlocks(content);
  const html = locale === 'te' && blocks.visionTe ? blocks.visionTe : blocks.visionEn;

  return (
    <div>
      <PageHero
        title={t('vision')}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('about'), href: '/about' },
          { label: t('vision') },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <figure className="shadow-pub-md relative mb-10 aspect-[16/9] overflow-hidden rounded-[var(--radius-pub-lg)]">
          <Image
            src="/images/illustrations/our-vision.jpg"
            alt="Sai Yadadri Seva Ashram's vision of care, dignity and service across elderly care, education, healthcare and Goseva"
            fill
            priority
            sizes="(min-width: 1024px) 768px, 100vw"
            className="object-cover"
          />
        </figure>
        <RichContent
          html={html}
          className="[&_h2]:border-pub-gold-300/40 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:pb-2 [&_h2]:first:mt-0"
        />
      </div>
    </div>
  );
}
