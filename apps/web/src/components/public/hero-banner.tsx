import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Carousel } from '@/components/public/carousel';
import { PremiumButton } from '@/components/public/premium-button';
import { STOCK_IMAGES } from '@/lib/stock-images';
import type { HeroBanner, SiteSettings } from '@/types/public';

const scrollIndicator = (
  <div className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-white/70 sm:flex">
    <span className="text-[0.65rem] font-medium tracking-[0.3em] uppercase">Scroll</span>
    <ChevronDown className="size-4 animate-bounce" />
  </div>
);

/** Homepage Hero Banner section (design/05-Wireframes.md "Home"). When the
 * admin hasn't published any banners yet, renders a graceful fallback built
 * only from already-verified `SiteSettings` copy (name/tagline) — never
 * fabricated marketing text — rather than nothing at all. */
export async function HeroBannerSection({
  banners,
  settings,
}: {
  banners: HeroBanner[];
  settings: SiteSettings;
}) {
  const locale = await getLocale();
  const t = await getTranslations('Common');

  if (banners.length === 0) {
    const siteName =
      locale === 'te' && settings.siteNameTe ? settings.siteNameTe : settings.siteNameEn;
    const tagline = locale === 'te' && settings.taglineTe ? settings.taglineTe : settings.taglineEn;

    return (
      <section className="relative flex h-[68vh] min-h-[480px] items-center justify-center overflow-hidden sm:h-[78vh]">
        <Image
          src={STOCK_IMAGES.templeDeity}
          alt=""
          fill
          priority
          unoptimized
          className="scale-105 object-cover"
        />
        <div className="from-pub-primary-950/90 via-pub-primary-950/55 absolute inset-0 bg-gradient-to-t to-black/30" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 text-center text-white">
          <span className="pub-divider-gold" />
          <h1 className="font-pub-heading text-4xl leading-[1.1] font-semibold text-balance sm:text-6xl lg:text-[4.25rem]">
            {siteName}
          </h1>
          {tagline && (
            <p className="pub-text-gradient-gold max-w-xl text-lg font-medium italic sm:text-xl">
              {tagline}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <PremiumButton render={<Link href="/donate" />} size="lg">
              {t('donateNow')}
            </PremiumButton>
            <PremiumButton render={<Link href="/about" />} tone="ghost-light" size="lg">
              {t('learnMore')}
            </PremiumButton>
          </div>
        </div>
        {scrollIndicator}
      </section>
    );
  }

  return (
    <div className="relative">
      <Carousel className="h-[68vh] min-h-[480px] sm:h-[78vh]" autoAdvanceMs={7000}>
        {banners.map((banner) => {
          const title = locale === 'te' && banner.titleTe ? banner.titleTe : banner.titleEn;
          const subtitle =
            locale === 'te' && banner.subtitleTe ? banner.subtitleTe : banner.subtitleEn;
          const ctaLabel =
            locale === 'te' && banner.ctaLabelTe ? banner.ctaLabelTe : banner.ctaLabelEn;

          return (
            <div
              key={banner.id}
              className="relative h-[68vh] min-h-[480px] overflow-hidden sm:h-[78vh]"
            >
              <Image
                src={banner.imageUrl}
                alt={title}
                fill
                priority
                className="animate-[kenburns_18s_ease-in-out_infinite_alternate] object-cover"
              />
              <div className="from-pub-primary-950/90 via-pub-primary-950/40 absolute inset-0 bg-gradient-to-t to-black/10" />
              <div className="relative mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-5 px-4 text-center text-white">
                <span className="pub-divider-gold" />
                <h1 className="font-pub-heading text-4xl leading-[1.1] font-semibold text-balance sm:text-6xl lg:text-[4.25rem]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                    {subtitle}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                  <PremiumButton render={<Link href="/donate" />} size="lg">
                    {t('donateNow')}
                  </PremiumButton>
                  {banner.ctaUrl && ctaLabel && (
                    <PremiumButton
                      render={<Link href={banner.ctaUrl} />}
                      tone="ghost-light"
                      size="lg"
                    >
                      {ctaLabel}
                    </PremiumButton>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Carousel>
      {scrollIndicator}
    </div>
  );
}
