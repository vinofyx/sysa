'use client';

import { BadgeCheck, ShieldCheck, Landmark } from 'lucide-react';
import { useTranslations } from 'next-intl';

const VARIANTS = {
  'registered-ngo': { icon: BadgeCheck, labelKey: 'registeredNgo' },
  'secure-payment': { icon: ShieldCheck, labelKey: 'securePayment' },
  // Not translated — a formal tax-certification code, not prose.
  'tax-exempt': { icon: Landmark, labelKey: null },
} as const;

/** design/07-Component-Library.md §5.5 `TrustBadge` — `tax-exempt` should
 * only be rendered once the client's 12A/80G certification is confirmed. */
export function TrustBadge({ variant, label }: { variant: keyof typeof VARIANTS; label?: string }) {
  const t = useTranslations('Common');
  const { icon: Icon, labelKey } = VARIANTS[variant];
  const defaultLabel = labelKey ? t(labelKey) : '12A / 80G';
  return (
    <span className="border-pub-gold-100 bg-pub-gold-100/70 text-pub-primary-800 dark:text-pub-gold-300 shadow-pub-sm inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold">
      <Icon className="text-pub-gold-700 size-3.5" /> {label ?? defaultLabel}
    </span>
  );
}
