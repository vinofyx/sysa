import { redirect } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';

import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getServerUser } from '@/lib/server-auth';

import './admin.css';

// Scoped to the admin nav chrome only (brand wordmark + section labels) —
// distinct from `[locale]/layout.tsx`'s `--font-playfair`, since admin
// routes sit outside that segment and don't share its font-loader instance.
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
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        {/* Reasserts the normal theme-driven background so every existing
            admin page renders unchanged regardless of the dark canvas
            behind the floating sidebar. */}
        <main className="bg-background flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
