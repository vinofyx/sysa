import type { Metadata } from 'next';
import Image from 'next/image';
import { Quote, MessageSquareQuote } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { EmptyState } from '@/components/shared/empty-state';
import { getSiteSettings, getTestimonials } from '@/lib/public-api';
import { buildMetadata, localizedDefaultDescription } from '@/lib/seo';
import { translateTestimonialAuthor } from '@/lib/testimonial-labels';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/testimonials',
    title: `${t('testimonials')} — ${settings.siteNameEn}`,
    description: localizedDefaultDescription(settings, locale),
  });
}

export default async function TestimonialsPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');
  const testimonials = await getTestimonials();

  return (
    <div>
      <PageHero
        title={t('testimonials')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('testimonials') }]}
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {testimonials.length === 0 ? (
          <EmptyState icon={MessageSquareQuote} title={tCommon('comingSoon')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => {
              const quote =
                locale === 'te' && testimonial.quoteTe ? testimonial.quoteTe : testimonial.quoteEn;
              const { authorName, authorRole } = translateTestimonialAuthor(testimonial, locale);
              return (
                <div
                  key={testimonial.id}
                  className="border-pub-neutral-200 bg-pub-neutral-white flex flex-col gap-3 rounded-xl border p-6"
                >
                  <Quote className="text-pub-gold-500 size-6" />
                  <p className="text-pub-neutral-900 flex-1 text-sm leading-relaxed italic">
                    &ldquo;{quote}&rdquo;
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {testimonial.photoUrl && (
                      <Image
                        src={testimonial.photoUrl}
                        alt={authorName}
                        width={40}
                        height={40}
                        className="size-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="text-pub-primary-900 dark:text-pub-neutral-900 text-sm font-semibold">
                        {authorName}
                      </p>
                      {authorRole && <p className="text-pub-neutral-500 text-xs">{authorRole}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
