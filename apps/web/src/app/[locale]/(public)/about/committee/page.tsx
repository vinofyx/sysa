import type { Metadata } from 'next';
import Image from 'next/image';
import { Phone, Users } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { EmptyState } from '@/components/admin/empty-state';
import { getCommitteeMembers, getSiteSettings } from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/about/committee',
    title: `${t('committee')} — ${settings.siteNameEn}`,
    description: settings.defaultMetaDescription ?? settings.taglineEn ?? settings.siteNameEn,
  });
}

export default async function CommitteePage() {
  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');
  const members = await getCommitteeMembers();

  return (
    <div>
      <PageHero
        title={t('committee')}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('about'), href: '/about' },
          { label: t('committee') },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {members.length === 0 ? (
          <EmptyState icon={Users} title={tCommon('comingSoon')} />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {members.map((member) => (
              <div key={member.id} className="flex flex-col items-center text-center">
                <div className="bg-pub-primary-100 relative size-24 overflow-hidden rounded-full sm:size-28">
                  {member.photoUrl ? (
                    <Image src={member.photoUrl} alt={member.name} fill className="object-cover" />
                  ) : (
                    <div className="text-pub-primary-700 flex size-full items-center justify-center text-2xl font-semibold">
                      {member.name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <p className="font-pub-heading text-pub-primary-900 mt-3 text-sm font-semibold">
                  {member.name}
                </p>
                <p className="text-pub-neutral-500 text-xs">{member.designation}</p>
                {member.mobile && (
                  <a
                    href={`tel:${member.mobile}`}
                    className="text-pub-neutral-500 hover:text-pub-primary-700 mt-1 flex items-center gap-1 text-xs"
                  >
                    <Phone className="size-3" />
                    {member.mobile}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
