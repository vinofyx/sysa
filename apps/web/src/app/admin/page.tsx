'use client';

import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  KeyRound,
  UserCog,
  Users,
  Wallet,
  FileText,
  Bell,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/admin/stat-card';
import { useMe } from '@/hooks/use-auth';
import { useUsersCount } from '@/hooks/use-users';
import { env } from '@/lib/env';

export default function AdminDashboardPage() {
  const { data: user } = useMe();
  const canViewUsers = user?.permissions.includes('users:view') ?? false;
  const usersCount = useUsersCount(canViewUsers);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user ? `, ${user.name}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here&apos;s what&apos;s happening across the platform.
        </p>
      </div>

      {/* KPI tiles — design/09-Admin-Modules.md §4. Only "Admin Users" reflects real
          data in this phase; the rest are explicit placeholders until their
          respective business modules ship (Phase 5/6+) — no fabricated numbers. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Admin Users"
          icon={UserCog}
          value={usersCount.data?.pagination.total}
          isLoading={canViewUsers && usersCount.isLoading}
          comingSoon={!canViewUsers}
        />
        <StatCard label="Donations (This Month)" icon={Wallet} comingSoon />
        <StatCard label="Active Volunteers" icon={Users} comingSoon />
        <StatCard label="Upcoming Events" icon={CalendarDays} comingSoon />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart placeholder — explicitly requested as a placeholder for this phase. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Donation Trends</CardTitle>
            <CardDescription>
              Live charts will appear here once the donation module (Phase 5) is implemented.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-muted-foreground/25 text-muted-foreground flex h-56 items-center justify-center rounded-md border border-dashed">
              <div className="flex flex-col items-center gap-2 text-sm">
                <BarChart3 className="size-8" />
                Chart placeholder
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recent activity relevant to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 text-center text-sm">
              <Bell className="size-8" />
              <p>You&apos;re all caught up.</p>
              <p className="text-xs">
                Notifications will appear here once content and donation modules are live.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks, available right now.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" render={<Link href="/admin/profile" />}>
            <UserCog className="size-4" /> View Profile
          </Button>
          <Button variant="outline" render={<Link href="/admin/profile#security" />}>
            <KeyRound className="size-4" /> Change Password
          </Button>
          <Button
            variant="outline"
            render={
              <a href={`${env.NEXT_PUBLIC_API_URL}/api/v1/docs`} target="_blank" rel="noreferrer" />
            }
          >
            <FileText className="size-4" /> API Documentation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
