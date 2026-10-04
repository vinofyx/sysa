import { redirect } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';

import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar, AdminSidebarRail } from '@/components/admin/admin-sidebar';
import { AdminThemeScope } from '@/components/admin/admin-theme-scope';
import { getServerUser } from '@/lib/server-auth';

import './admin.css';

// Scoped to the admin nav chrome only (brand wordmark + section labels) —
// distinct from `(public)/layout.tsx`'s `--font-playfair`, since admin
// routes sit outside that route group and don't share its font-loader instance.
const playfairDisplay = Playfair_Display({
  variable: '--font-admin-playfair',
  subsets: ['latin'],
  weight: ['600', '700'],
});

/**
 * Admin shell — Server Component so the authoritative identity/permission check
 * (via the backend's /auth/me, see lib/server-auth.ts) happens before any admin
 * UI renders, not as a client-side afterthought. `middleware.ts` already redirects
 * unauthenticated requests based on cookie presence; this is the authoritative
 * second check (a stale/tampered cookie still gets rejected here).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  return (
    <div className={`${playfairDisplay.variable} admin-shell flex min-h-screen`}>
      <AdminThemeScope />
      <AdminSidebarRail />
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        {/* `.admin-content` (admin.css) scopes the shared shadcn token names
            to a brand-matched light/dark palette for every admin page, table,
            form, and dialog — see admin.css's top comment. */}
        <main className="admin-content bg-background flex-1 p-4 md:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
