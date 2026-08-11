import Image from 'next/image';
import { ArrowUpRight, HeartHandshake } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Reveal } from '@/components/public/motion';
import type { Activity } from '@/types/public';

export async function ActivityCard({
  activity,
  locale,
  index = 0,
}: {
  activity: Activity;
  locale: string;
  index?: number;
}) {
  const t = await getTranslations('Common');
  const title = locale === 'te' && activity.titleTe ? activity.titleTe : activity.titleEn;
  const description =
    locale === 'te' && activity.descriptionTe ? activity.descriptionTe : activity.descriptionEn;

  return (
    <Reveal delay={index * 0.08} className="h-full">
      <Link
        href={`/activities/${activity.slug}`}
        className="border-pub-neutral-200/70 shadow-pub-md hover:shadow-pub-xl group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-pub-card)] border bg-white transition-all duration-500 hover:-translate-y-2"
      >
        <div className="bg-pub-primary-100 relative aspect-[4/3] overflow-hidden">
          {activity.iconOrImageUrl ? (
            <Image
              src={activity.iconOrImageUrl}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="pub-gradient-emerald flex size-full items-center justify-center">
              <HeartHandshake className="text-pub-gold-300 size-12" strokeWidth={1.5} />
            </div>
          )}
          <div className="from-pub-primary-950/85 absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <span className="pub-gradient-gold text-pub-primary-950 absolute top-4 left-4 rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wide uppercase shadow-md">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-6">
          <h3 className="font-pub-heading text-pub-primary-950 text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-pub-neutral-500 line-clamp-3 text-sm leading-relaxed">
              {description.replace(/<[^>]+>/g, '')}
            </p>
          )}
          <span className="text-pub-gold-700 group-hover:text-pub-gold-500 mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold transition-colors">
            {t('readMore')}
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
