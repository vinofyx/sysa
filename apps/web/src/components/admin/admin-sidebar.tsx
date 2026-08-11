import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { SidebarNav } from '@/components/admin/sidebar-nav';

/** Persistent desktop sidebar — hidden below the `lg` breakpoint, per
 * design/08-Responsive-Design.md §3.6 (admin's tablet-minimum, icon-rail-below-that
 * strategy is handled by the mobile Sheet in admin-header.tsx instead).
 *
 * Deliberately theme-independent (dark regardless of the light/dark toggle
 * in the topbar) — the same "always-dark chrome, theme-able canvas" split
 * Linear/Vercel/Stripe's dashboards use; see admin.css for the token set. */
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
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <span className="admin-gradient-emerald shadow-admin-glow-emerald flex size-11 shrink-0 items-center justify-center rounded-full ring-1 ring-white/10">
            <ShieldCheck className="text-admin-gold-300 size-5" strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-admin-heading text-admin-text truncate text-base leading-tight font-semibold tracking-tight">
              Sai Yadadri Seva Ashram
            </span>
            <span className="text-admin-gold-500 text-[11px] font-semibold tracking-[0.15em] uppercase">
              Administration Portal
            </span>
          </span>
        </Link>
      </div>

      <div className="admin-scroll relative flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}
