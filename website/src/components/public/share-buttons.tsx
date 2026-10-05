'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const t = useTranslations('Common');
  const [copied, setCopied] = React.useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-pub-neutral-500 flex items-center gap-1.5 text-xs font-medium">
        <Share2 className="size-3.5" /> {t('share')}
      </span>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`}
        target="_blank"
        rel="noreferrer"
        aria-label={t('shareOnWhatsApp')}
        className="text-pub-neutral-500 hover:text-pub-primary-700 dark:hover:text-pub-gold-300"
      >
        <MessageCircle className="size-4" />
      </a>
      <button
        type="button"
        onClick={copyLink}
        aria-label={t('copyLink')}
        className="text-pub-neutral-500 hover:text-pub-primary-700 dark:hover:text-pub-gold-300"
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}
