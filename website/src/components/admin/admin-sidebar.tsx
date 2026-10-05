import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { SidebarNav } from '@/components/admin/sidebar-nav';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** The badge + wordmark shown at the top of both sidebar variants below —
 * `compact` swaps the full wordmark for just the badge (wrapped in a
 * tooltip), sized for the narrow tablet rail. */
function SidebarBrand({ compact }: { compact?: boolean }) {
  const badge = (
    <span className="admin-gradient-emerald shadow-admin-glow-emerald flex size-11 shrink-0 items-center justify-center rounded-full ring-1 ring-white/10">
      <ShieldCheck className="text-admin-gold-300 size-5" strokeWidth={2} />
    </span>
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link href="/admin" className="flex items-center justify-center" aria-label="Dashboard">
              {badge}
            </Link>
          }
        />
        <TooltipContent side="right">
          Sai Yadadri Seva Ashram — Administration Portal
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href="/admin" className="flex min-w-0 items-center gap-3">
      {badge}
      <span className="flex min-w-0 flex-col">
        <span className="font-admin-heading text-admin-text truncate text-base leading-tight font-semibold tracking-tight">
          Sai Yadadri Seva Ashram
        </span>
        <span className="text-admin-label text-[11px] font-semibold tracking-[0.15em] uppercase">
          Administration Portal
        </span>
      </span>
    </Link>
  );
}

/** Persistent desktop sidebar — visible from the `lg` breakpoint up.
 * `AdminSidebarRail` below covers the `md`-to-`lg` tablet gap so the sidebar
 * never falls back to the mobile-only drawer purely for lack of width; see
 * design/08-Responsive-Design.md §3.6.
 *
 * Its own "premium chrome" palette, distinct from the main content area's
 * (see `.admin-content` in admin.css) but equally theme-aware — light and
 * dark each get a deliberately designed `--color-admin-*` palette rather
 * than one being a plain inversion of the other; see admin.css for the
 * token set. */
export function AdminSidebar() {
  return (
    <aside className="admin-gradient-sidebar border-admin-border shadow-admin-lg relative m-3 hidden w-72 shrink-0 overflow-hidden rounded-[20px] border lg:flex lg:flex-col">
      <div
        aria-hidden
        className="admin-glow bg-admin-emerald-500/20 pointer-events-none absolute -top-24 -left-20 size-64 rounded-full blur-[100px]"
      />
      <div
        aria-hidden
        className="admin-glow bg-admin-gold-500/10 pointer-events-none absolute -right-16 -bottom-28 size-64 rounded-full blur-[100px]"
        style={{ animationDelay: '2s' }}
      />

      <div className="border-admin-border relative flex h-20 shrink-0 items-center border-b px-5">
        <SidebarBrand />
      </div>

      <div className="admin-scroll relative flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}

/** Compact icon-only rail for tablet (`md` up to, but not including, `lg` —
 * 768–1023px): a persistent, low-footprint presence rather than falling
 * back to a full-width overlay drawer purely for lack of space, per the
 * brief's "collapsed or icon-focused" tablet spec. The full labeled sidebar
 * remains one tap away via the header's menu button (opens the same Sheet
 * drawer mobile uses) for whenever the tablet user wants expanded labels. */
export function AdminSidebarRail() {
  return (
    <aside className="admin-gradient-sidebar border-admin-border shadow-admin-lg relative m-3 hidden w-[76px] shrink-0 overflow-hidden rounded-[20px] border md:flex md:flex-col lg:hidden">
      <div
        aria-hidden
        className="admin-glow bg-admin-emerald-500/20 pointer-events-none absolute -top-24 -left-20 size-64 rounded-full blur-[100px]"
      />

      <div className="border-admin-border relative flex h-20 shrink-0 items-center justify-center border-b px-2">
        <SidebarBrand compact />
      </div>

      <div className="admin-scroll relative flex-1 overflow-y-auto">
        <SidebarNav collapsed />
      </div>
    </aside>
  );
}
