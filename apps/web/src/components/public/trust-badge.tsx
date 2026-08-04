import { BadgeCheck, ShieldCheck, Landmark } from 'lucide-react';

const VARIANTS = {
  'registered-ngo': { icon: BadgeCheck, label: 'Registered NGO' },
  'secure-payment': { icon: ShieldCheck, label: 'Secure Payment' },
  'tax-exempt': { icon: Landmark, label: '12A / 80G' },
} as const;

/** design/07-Component-Library.md §5.5 `TrustBadge` — `tax-exempt` should
 * only be rendered once the client's 12A/80G certification is confirmed. */
export function TrustBadge({ variant, label }: { variant: keyof typeof VARIANTS; label?: string }) {
  const { icon: Icon, label: defaultLabel } = VARIANTS[variant];
  return (
    <span className="border-pub-primary-100 bg-pub-primary-100 text-pub-primary-700 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
      <Icon className="size-3.5" /> {label ?? defaultLabel}
    </span>
  );
}
