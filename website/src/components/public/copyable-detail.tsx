'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

/** A bank-detail row: value first (large, prominent — what a donor actually
 * needs to read/copy), label below (small, muted — what it is). Used on the
 * donate page's Bank Transfer card. `copy` defaults to true; pass `false`
 * for fields like Bank Name that are informational, not something a donor
 * pastes into a transfer form. */
export function CopyableDetail({
  label,
  value,
  copy = true,
}: {
  label: string;
  value: string;
  copy?: boolean;
}) {
  const t = useTranslations('Common');
  const [copied, setCopied] = React.useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can reject (denied permission, insecure context, older
      // browser) — nothing more useful to do than leave the value selectable
      // on-screen for the donor to copy manually, so this just avoids an
      // unhandled rejection rather than showing a false "copied" state.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-pub-primary-950 dark:text-pub-neutral-900 truncate font-mono text-base font-semibold tracking-wide sm:text-lg">
          {value}
        </p>
        <p className="text-pub-neutral-500 mt-0.5 text-xs">{label}</p>
      </div>
      {copy && (
        <button
          type="button"
          onClick={copyValue}
          aria-label={`${t('copy')} ${label}`}
          className="border-pub-neutral-200 text-pub-neutral-700 hover:border-pub-primary-700 hover:text-pub-primary-700 dark:hover:border-pub-gold-300 dark:hover:text-pub-gold-300 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? t('copied') : t('copy')}
        </button>
      )}
    </div>
  );
}
