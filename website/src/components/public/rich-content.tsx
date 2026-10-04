import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/shared/empty-state';
import { FileText } from 'lucide-react';
import { sanitizeRichText } from '@/lib/sanitize';

/** Renders sanitized CMS rich text, or a "Coming Soon" state if the admin
 * hasn't published this section yet (design/05-Wireframes.md About wireframe
 * — Vision/Mission/Founder/Treasurer all define this fallback explicitly). */
export async function RichContent({ html, className }: { html: string; className?: string }) {
  if (!html.trim()) {
    const t = await getTranslations('Common');
    return <EmptyState icon={FileText} title={t('comingSoon')} />;
  }

  return (
    <div
      className={`text-pub-neutral-900 [&_a]:text-pub-primary-700 dark:[&_a]:text-pub-gold-300 [&_h2]:font-pub-heading [&_h2]:text-pub-primary-900 dark:[&_h2]:text-pub-neutral-900 [&_h3]:font-pub-heading [&_h3]:text-pub-primary-900 dark:[&_h3]:text-pub-neutral-900 max-w-none text-base leading-relaxed [&_a]:underline [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-4 [&_img]:rounded-lg [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}
