import { ChevronDown } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Carousel } from '@/components/public/carousel';
import { HeroVideoBackground } from '@/components/public/hero-video-background';
import { PremiumButton } from '@/components/public/premium-button';
import { STOCK_IMAGES } from '@/lib/stock-images';
import type { HeroBanner, SiteSettings } from '@/types/public';

// Mobile: fills the viewport below the sticky header (`h-16` = 4rem) using
// `svh` (small viewport height) so mobile browser chrome hiding/showing on
// scroll doesn't create a jump — `vh` alone can leave a gap once the address
// bar collapses. This must be an explicit `height`, not `min-height`: a
// `min-height`-only box isn't "definite" for CSS percentage-height purposes,
// so the `h-full` chain down through Carousel → slide → content (needed for
// `items-center` to actually center the content) silently resolves to the
// content's own auto height instead, leaving the content pinned to the top
// with dead space below (confirmed by measuring the live DOM — the outer box
// was 780px with min-height alone, but content stayed 372px, unmoved).
// sm+: unchanged from the original fixed-height desktop design.
const HERO_HEIGHT = 'h-[calc(100svh-4rem)] min-h-[420px] sm:min-h-[480px] sm:h-[78vh]';

function ScrollIndicator({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-white/70 sm:flex">
      <span className="text-[0.65rem] font-medium tracking-[0.3em] uppercase">{label}</span>
      <ChevronDown className="size-4 animate-bounce" />
    </div>
  );
}

/** Homepage Hero Banner section (design/05-Wireframes.md "Home"). A looping
 * video (see HeroVideoBackground) plays continuously behind the section;
 * the admin-managed banner title/subtitle/CTA content still cycles on top
 * of it exactly as it did over photos before. When the admin hasn't
 * published any banners yet, renders a graceful fallback built only from
 * already-verified `SiteSettings` copy (name/tagline) — never fabricated
 * marketing text — rather than nothing at all. */
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
      <section
        className={`relative flex items-center justify-center overflow-hidden sm:pb-32 ${HERO_HEIGHT}`}
      >
        <HeroVideoBackground poster={STOCK_IMAGES.templeDeity} />
        <div className="from-pub-primary-950/92 via-pub-primary-950/55 absolute inset-0 bg-gradient-to-t to-black/25" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 text-center text-white">
          <span className="text-pub-gold-300 text-xs font-semibold tracking-[0.28em] uppercase">
            {t('registeredNgo')}
          </span>
          <span className="pub-divider-gold" />
          <h1 className="font-pub-heading text-4xl leading-[1.08] font-semibold text-balance sm:text-6xl lg:text-[4.25rem]">
            {siteName}
          </h1>
          {tagline && (
            <p className="pub-text-gradient-gold max-w-xl text-lg font-medium italic sm:text-xl">
              {tagline}
            </p>
          )}
          <div className="relative z-20 mt-4 flex flex-wrap justify-center gap-4">
            <PremiumButton render={<Link href="/donate#online-donation" />} size="lg">
              {t('donateNow')}
            </PremiumButton>
            <PremiumButton render={<Link href="/activities" />} tone="ghost-light" size="lg">
              {t('exploreOurWork')}
            </PremiumButton>
          </div>
        </div>
        <ScrollIndicator label={t('scroll')} />
      </section>
    );
  }

  return (
    <div className={`relative overflow-hidden sm:pb-32 ${HERO_HEIGHT}`}>
      <HeroVideoBackground poster={banners[0]?.imageUrl} />
      <div className="from-pub-primary-950/92 via-pub-primary-950/45 absolute inset-0 bg-gradient-to-t to-black/15" />

      <Carousel className="relative h-full" slideClassName="h-full" autoAdvanceMs={7000}>
        {banners.map((banner) => {
          const title = locale === 'te' && banner.titleTe ? banner.titleTe : banner.titleEn;
          const subtitle =
            locale === 'te' && banner.subtitleTe ? banner.subtitleTe : banner.subtitleEn;
          const ctaLabel =
            locale === 'te' && banner.ctaLabelTe ? banner.ctaLabelTe : banner.ctaLabelEn;

          return (
            <div
              key={banner.id}
              className="relative flex h-full flex-col items-center justify-center gap-5 px-4 text-center text-white"
            >
              <span className="text-pub-gold-300 text-xs font-semibold tracking-[0.28em] uppercase">
                {t('registeredNgo')}
              </span>
              <span className="pub-divider-gold" />
              <h1 className="font-pub-heading mx-auto max-w-3xl text-4xl leading-[1.08] font-semibold text-balance sm:text-6xl lg:text-[4.25rem]">
                {title}
              </h1>
              {subtitle && (
                <p className="mx-auto max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                  {subtitle}
                </p>
              )}
              <div className="relative z-20 mt-4 flex flex-wrap justify-center gap-4">
                <PremiumButton render={<Link href="/donate#online-donation" />} size="lg">
                  {t('donateNow')}
                </PremiumButton>
                {banner.ctaUrl && ctaLabel ? (
                  <PremiumButton
                    render={<Link href={banner.ctaUrl} />}
                    tone="ghost-light"
                    size="lg"
                  >
                    {ctaLabel}
                  </PremiumButton>
                ) : (
                  <PremiumButton render={<Link href="/activities" />} tone="ghost-light" size="lg">
                    {t('exploreOurWork')}
                  </PremiumButton>
                )}
              </div>
            </div>
          );
        })}
      </Carousel>
      <ScrollIndicator label={t('scroll')} />
    </div>
  );
}
