'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { IndianRupee, Receipt, TrendingUp } from 'lucide-react';

interface DonationAnalytics {
  totalCount: number;
  totalAmount: number;
  byCategory: { categoryId: string; nameEn: string; total: number; count: number }[];
  byStatus: { status: string; count: number }[];
  byMonth: { month: string; total: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--color-chart-1, #22c55e)',
  pending: 'var(--color-chart-2, #eab308)',
  failed: 'var(--color-chart-3, #ef4444)',
  refunded: 'var(--color-chart-4, #6b7280)',
};

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function useAnalytics(dateFrom: string, dateTo: string) {
  return useQuery<DonationAnalytics>({
    queryKey: ['donation-analytics', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await apiClient.get<{ analytics: DonationAnalytics }>(
        '/donations/analytics',
        {
          params: { ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) },
        },
      );
      return data.analytics;
    },
  });
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const { data, isLoading } = useAnalytics(dateFrom, dateTo);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Donation analytics — currently the only reporting data source the backend provides; volunteer/event reports are not yet built."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Reports' }]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <label className="text-muted-foreground text-sm">From</label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="w-40"
        />
        <label className="text-muted-foreground text-sm">To</label>
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="w-40"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total completed donations"
          value={data ? currency(data.totalAmount) : undefined}
          icon={IndianRupee}
          isLoading={isLoading}
        />
        <StatCard
          label="Completed transactions"
          value={data?.totalCount}
          icon={Receipt}
          isLoading={isLoading}
        />
        <StatCard
          label="Categories with donations"
          value={data?.byCategory.length}
          icon={TrendingUp}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Donations by month</CardTitle>
            <CardDescription>Completed donation total, by calendar month.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data?.byMonth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(value) => currency(Number(value))} />
                  <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Donations by category</CardTitle>
            <CardDescription>Completed donation total, by donation category.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.byCategory ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="nameEn"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(value) => currency(Number(value))} />
                  <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Donations by status</CardTitle>
            <CardDescription>
              All donations (any status) in the selected date range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data?.byStatus ?? []}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {(data?.byStatus ?? []).map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
