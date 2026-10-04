import { CloudOff } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { PremiumButton } from '@/components/public/premium-button';

/** Shown in place of any form that POSTs to the live backend (contact,
 * volunteer, event registration, bank transfer claim) when built for the
 * Hostinger static export — there is no reachable server to submit to, so
 * this states that plainly instead of letting the form fail silently. The
 * message itself must stay visitor-facing (no "backend"/"static deployment"
 * wording) — this component only supplies the layout, not the copy. */
export function StaticFormUnavailable({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="border-pub-neutral-200 bg-pub-neutral-white flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
      <CloudOff className="text-pub-neutral-400 size-8" aria-hidden />
      <h3 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 text-base font-semibold">
        {title}
      </h3>
      <p className="text-pub-neutral-500 text-sm">{message}</p>
      {cta && (
        <PremiumButton render={<Link href={cta.href} />} tone="emerald" size="sm" className="mt-1">
          {cta.label}
        </PremiumButton>
      )}
    </div>
  );
}
