import Link from 'next/link';

import { SidebarNav } from '@/components/admin/sidebar-nav';

/** Persistent desktop sidebar — hidden below the `lg` breakpoint, per
 * design/08-Responsive-Design.md §3.6 (admin's tablet-minimum, icon-rail-below-that
 * strategy is handled by the mobile Sheet in admin-header.tsx instead). */
export function AdminSidebar() {
  return (
    <aside className="bg-card hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/admin" className="text-sm font-semibold tracking-tight">
          Sai Yadadri Seva Ashram
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}
