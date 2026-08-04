'use client';

import { useLocale } from 'next-intl';
import { Languages } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';

const LABELS: Record<string, string> = { en: 'English', te: 'తెలుగు' };

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === 'en' ? 'te' : 'en';

  return (
    <Link
      href={pathname}
      locale={other}
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${className ?? ''}`}
      aria-label={`Switch to ${LABELS[other]}`}
    >
      <Languages className="size-4" aria-hidden="true" />
      {LABELS[other]}
    </Link>
  );
}
