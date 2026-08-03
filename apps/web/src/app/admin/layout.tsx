import { redirect } from 'next/navigation';

import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getServerUser } from '@/lib/server-auth';

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
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
