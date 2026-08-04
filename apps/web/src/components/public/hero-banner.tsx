import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Carousel } from '@/components/public/carousel';
import type { HeroBanner } from '@/types/public';

/** Homepage Hero Banner section (design/05-Wireframes.md "Home"). Renders
 * nothing if no active banners are published — never a placeholder image. */
export async function HeroBannerSection({ banners }: { banners: HeroBanner[] }) {
  if (banners.length === 0) return null;

  const locale = await getLocale();
  const t = await getTranslations('Common');

  return (
    <Carousel className="h-[60vh] sm:h-[65vh] lg:h-[80vh]" autoAdvanceMs={7000}>
      {banners.map((banner) => {
        const title = locale === 'te' && banner.titleTe ? banner.titleTe : banner.titleEn;
        const subtitle =
          locale === 'te' && banner.subtitleTe ? banner.subtitleTe : banner.subtitleEn;
        const ctaLabel =
          locale === 'te' && banner.ctaLabelTe ? banner.ctaLabelTe : banner.ctaLabelEn;

        return (
          <div key={banner.id} className="relative h-[60vh] sm:h-[65vh] lg:h-[80vh]">
            <Image
              src={banner.imageUrl}
              alt={title}
              fill
              unoptimized
              priority
              className="object-cover"
            />
            <div className="from-pub-primary-900/80 absolute inset-0 bg-gradient-to-t via-black/20 to-transparent" />
            <div className="relative mx-auto flex h-full max-w-3xl flex-col items-center justify-end gap-4 px-4 pb-16 text-center text-white">
              <h1 className="font-pub-heading text-3xl font-bold text-balance sm:text-5xl">
                {title}
              </h1>
              {subtitle && (
                <p className="max-w-xl text-base text-white/90 sm:text-lg">{subtitle}</p>
              )}
              <div className="mt-2 flex gap-3">
                <Button
                  render={<Link href="/donate" />}
                  size="lg"
                  className="bg-pub-gold-500 hover:bg-pub-gold-700 text-pub-primary-900"
                >
                  {t('donateNow')}
                </Button>
                {banner.ctaUrl && ctaLabel && (
                  <Button
                    render={<Link href={banner.ctaUrl} />}
                    variant="outline"
                    size="lg"
                    className="border-white bg-transparent text-white hover:bg-white/10"
                  >
                    {ctaLabel}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </Carousel>
  );
}
