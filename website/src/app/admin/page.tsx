'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { useMe } from '@/hooks/use-auth';
import { useUsersCount } from '@/hooks/use-users';
import { apiClient } from '@/lib/api-client';
import { env } from '@/lib/env';
import type { PaginatedResult } from '@/types/pagination';

interface DonationAnalytics {
  totalAmount: number;
  byMonth: { month: string; total: number }[];
}

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function firstOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export default function AdminDashboardPage() {
  const { data: user } = useMe();
  const canViewUsers = user?.permissions.includes('users:view') ?? false;
  const canViewDonations = user?.permissions.includes('donations:view') ?? false;
  const canViewVolunteers = user?.permissions.includes('volunteers:view') ?? false;
  const canViewEvents = user?.permissions.includes('events:view') ?? false;

  const usersCount = useUsersCount(canViewUsers);

  const analytics = useQuery<DonationAnalytics>({
    queryKey: ['donation-analytics', 'dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ analytics: DonationAnalytics }>(
        '/donations/analytics',
        {
          params: { dateFrom: firstOfMonthIso() },
        },
      );
      return data.analytics;
    },
    enabled: canViewDonations,
  });

  const volunteersCount = useQuery<PaginatedResult<unknown>>({
    queryKey: ['volunteers', 'dashboard-count'],
    queryFn: async () => {
      const { data } = await apiClient.get('/volunteers', { params: { page: 1, pageSize: 1 } });
      return data;
    },
    enabled: canViewVolunteers,
  });

  const eventsCount = useQuery<PaginatedResult<unknown>>({
    queryKey: ['events', 'dashboard-count'],
    queryFn: async () => {
      const { data } = await apiClient.get('/events', {
        params: { page: 1, pageSize: 1, status: 'published' },
      });
      return data;
    },
    enabled: canViewEvents,
  });

  return (
    <div>
      <PageHeader
        title={`Welcome back${user ? `, ${user.name}` : ''}`}
        description="Here's what's happening across the platform."
      />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Admin Users"
            icon={UserCog}
            value={usersCount.data?.pagination.total}
            isLoading={canViewUsers && usersCount.isLoading}
            comingSoon={!canViewUsers}
          />
          <StatCard
            label="Donations (This Month)"
            icon={Wallet}
            value={analytics.data ? currency(analytics.data.totalAmount) : undefined}
            isLoading={canViewDonations && analytics.isLoading}
            comingSoon={!canViewDonations}
          />
          <StatCard
            label="Registered Volunteers"
            icon={Users}
            value={volunteersCount.data?.pagination.total}
            isLoading={canViewVolunteers && volunteersCount.isLoading}
            comingSoon={!canViewVolunteers}
          />
          <StatCard
            label="Published Events"
            icon={CalendarDays}
            value={eventsCount.data?.pagination.total}
            isLoading={canViewEvents && eventsCount.isLoading}
            comingSoon={!canViewEvents}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Donation Trends</CardTitle>
              <CardDescription>Completed donations by month.</CardDescription>
            </CardHeader>
            <CardContent>
              {!canViewDonations ? (
                <div className="border-muted-foreground/25 text-muted-foreground flex h-56 items-center justify-center rounded-md border border-dashed">
                  <div className="flex flex-col items-center gap-2 text-sm">
                    <BarChart3 className="size-8" />
                    You don&apos;t have permission to view donation data.
                  </div>
                </div>
              ) : analytics.isLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : !analytics.data?.byMonth.length ? (
                <div className="border-muted-foreground/25 text-muted-foreground flex h-56 items-center justify-center rounded-md border border-dashed">
                  <div className="flex flex-col items-center gap-2 text-sm">
                    <BarChart3 className="size-8" />
                    No donations recorded yet this month.
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={224}>
                  <LineChart data={analytics.data?.byMonth ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      stroke="var(--border)"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      tickFormatter={(v) => `₹${v / 1000}k`}
                      stroke="var(--border)"
                    />
                    <Tooltip
                      formatter={(value) => currency(Number(value))}
                      contentStyle={{
                        background: 'var(--popover)',
                        color: 'var(--popover-foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                      }}
                      labelStyle={{ color: 'var(--popover-foreground)' }}
                      cursor={{ stroke: 'var(--border)' }}
                    />
                    <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Recent activity relevant to you.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 text-center text-sm">
                <span className="bg-muted flex size-12 items-center justify-center rounded-full">
                  <Bell className="size-5" />
                </span>
                <p className="text-foreground font-medium">You&apos;re all caught up</p>
                <p className="text-xs">
                  A dedicated notification/activity feed isn&apos;t built yet — check the Audit Log
                  or each module&apos;s list page for recent changes.
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
                <a
                  href={`${env.NEXT_PUBLIC_API_URL}/api/v1/docs`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <FileText className="size-4" /> API Documentation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
