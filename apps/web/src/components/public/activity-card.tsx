import Image from 'next/image';
import { HeartHandshake } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { Activity } from '@/types/public';

export function ActivityCard({ activity, locale }: { activity: Activity; locale: string }) {
  const title = locale === 'te' && activity.titleTe ? activity.titleTe : activity.titleEn;
  const description =
    locale === 'te' && activity.descriptionTe ? activity.descriptionTe : activity.descriptionEn;

  return (
    <Link
      href={`/activities/${activity.slug}`}
      className="border-pub-neutral-200 shadow-pub-sm hover:shadow-pub-md group flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow"
    >
      <div className="bg-pub-primary-100 relative aspect-[4/3]">
        {activity.iconOrImageUrl ? (
          <Image
            src={activity.iconOrImageUrl}
            alt={title}
            fill
            unoptimized
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <HeartHandshake className="text-pub-primary-700 size-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-pub-heading text-pub-primary-900 text-base font-semibold">{title}</h3>
        {description && (
          <p className="text-pub-neutral-500 line-clamp-2 text-sm">
            {description.replace(/<[^>]+>/g, '')}
          </p>
        )}
      </div>
    </Link>
  );
}
