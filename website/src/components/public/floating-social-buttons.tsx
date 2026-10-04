'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';

import type { SiteSettings, SocialLink } from '@/types/public';

interface FloatingSocialButtonsProps {
  whatsappNumber: SiteSettings['whatsappNumber'];
  contactEmail: SiteSettings['contactEmail'];
  socialLinks: SocialLink[];
}

/** Minimal inline brand glyphs — kept distinct from the generic `Globe`
 * stand-ins in site-footer.tsx (that choice was for a plain link list; this
 * widget's whole purpose is at-a-glance platform recognition, so a
 * recognizable mark earns its place here). No icon package installed for
 * this alone — three small paths isn't worth a new dependency. */
function WhatsAppGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.32 4.94L2 22l5.2-1.36a9.96 9.96 0 0 0 4.84 1.23h.01c5.52 0 10-4.48 10-10s-4.49-9.87-10.01-9.87Zm0 18.15h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.09.81.82-3-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.22-8.24 2.2 0 4.26.86 5.82 2.42a8.15 8.15 0 0 1 2.41 5.82c0 4.54-3.7 8.18-8.24 8.18Zm4.5-6.14c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.96-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.47-.01a.9.9 0 0 0-.65.3c-.23.24-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.73 2.64 4.2 3.7.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

function InstagramGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7.6h2.55l.38-2.96h-2.93V8.55c0-.86.24-1.44 1.47-1.44h1.57V4.46c-.27-.04-1.2-.12-2.28-.12-2.26 0-3.8 1.38-3.8 3.91v2.18H7.99v2.96h2.47V21h3.04Z" />
    </svg>
  );
}

/**
 * Global floating action widget — always shows WhatsApp/Instagram/Facebook/
 * Email as independently clickable buttons, no click-to-expand step. Same
 * bottom-right corner as the previous standalone `WhatsAppFab` (same
 * whatsappNumber source) rather than stacking a second widget next to it.
 *
 * Entirely data-driven from the same `settings`/`socialLinks` props already
 * threaded through the public layout (site-footer.tsx uses the same
 * shapes) — never a fabricated placeholder link. A platform is simply
 * omitted from the group if it isn't configured yet.
 */
export function FloatingSocialButtons({
  whatsappNumber,
  contactEmail,
  socialLinks,
}: FloatingSocialButtonsProps) {
  const t = useTranslations('Social');
  const instagramUrl = socialLinks.find((l) => l.platform === 'instagram')?.url ?? null;
  const facebookUrl = socialLinks.find((l) => l.platform === 'facebook')?.url ?? null;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}`
    : null;
  const mailUrl = contactEmail ? `mailto:${contactEmail}` : null;

  const items = [
    {
      key: 'whatsapp',
      href: whatsappUrl,
      label: t('whatsappAriaLabel'),
      tooltip: t('whatsapp'),
      icon: WhatsAppGlyph,
      external: true,
      className: 'bg-[#25D366] text-white',
    },
    {
      key: 'instagram',
      href: instagramUrl,
      label: t('instagramAriaLabel'),
      tooltip: t('instagram'),
      icon: InstagramGlyph,
      external: true,
      className: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white',
    },
    {
      key: 'facebook',
      href: facebookUrl,
      label: t('facebookAriaLabel'),
      tooltip: t('facebook'),
      icon: FacebookGlyph,
      external: true,
      className: 'bg-[#1877F2] text-white',
    },
    {
      key: 'email',
      href: mailUrl,
      label: t('emailAriaLabel'),
      tooltip: t('email'),
      icon: Mail,
      external: false,
      className: 'bg-[var(--color-pub-gold-500)] text-white',
    },
  ].filter((item): item is typeof item & { href: string } => Boolean(item.href));

  if (items.length === 0) return null;

  return (
    <div
      className="fixed right-3 z-[99999] flex flex-col items-end gap-3 sm:right-6"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {items.map((item) => (
        <div key={item.key} className="group relative flex items-center gap-3">
          <span className="shadow-pub-sm pointer-events-none absolute right-full mr-3 hidden rounded-md bg-[var(--color-pub-primary-950)] px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:block">
            {item.tooltip}
          </span>
          <a
            href={item.href}
            target={item.external ? '_blank' : '_self'}
            rel={item.external ? 'noopener noreferrer' : undefined}
            aria-label={item.label}
            className={`flex size-[42px] shrink-0 items-center justify-center rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.22)] transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--color-pub-gold-500)] focus-visible:ring-offset-2 focus-visible:outline-none sm:size-[46px] ${item.className}`}
          >
            <item.icon className="size-5" />
          </a>
        </div>
      ))}
    </div>
  );
}
