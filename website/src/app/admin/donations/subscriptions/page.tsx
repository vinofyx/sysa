'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban } from 'lucide-react';
import type { AxiosError } from 'axios';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { createResourceHooks, apiErrorMessage } from '@/hooks/use-resource';
import { useHasPermission } from '@/hooks/use-permission';

type SubscriptionStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'expired';

interface DonorSubscription {
  id: string;
  amount: string;
  currency: string;
  status: SubscriptionStatus;
  razorpaySubscriptionId: string;
  startDate: string;
  nextChargeAt: string | null;
  cancelledAt: string | null;
  donor: { name: string; phone: string; email: string | null };
  category: { nameEn: string };
}

const resource = createResourceHooks<DonorSubscription>({
  resourceKey: 'donor-subscriptions',
  basePath: '/donor-subscriptions',
});

function currency(value: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/** ADMIN_REPORTING "Monthly Donors" view — read/manage over the recurring
 * `DonorSubscription` mandates created by the automatic-monthly checkout
 * flow (subscription.service.ts). Separate from the main /admin/donations
 * list, which already covers every individual charge (including each
 * subscription's own recurring charges, via `Donation.subscriptionId`) —
 * this page is specifically about the standing mandates themselves. */
export default function DonorSubscriptionsPage() {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<string>('all');
  const [cancelTarget, setCancelTarget] = React.useState<DonorSubscription | null>(null);

  const canManage = useHasPermission('donations:manage');
  const queryClient = useQueryClient();

  const query = {
    page,
    pageSize: 15,
    ...(status !== 'all' ? { status } : {}),
  };
  const { data, isLoading } = resource.useList(query);

  const cancelMutation = useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      await apiClient.post(`/donor-subscriptions/${id}/cancel`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resource.keys.all });
      toast.success('Subscription cancelled');
      setCancelTarget(null);
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Cancellation failed')),
  });

  const columns: DataTableColumn<DonorSubscription>[] = [
    {
      key: 'donor',
      header: 'Donor',
      render: (row) => (
        <div>
          <p className="font-medium">{row.donor.name}</p>
          <p className="text-muted-foreground text-xs">{row.donor.phone}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Monthly Amount',
      render: (row) => currency(row.amount),
    },
    { key: 'category', header: 'Category', render: (row) => row.category.nameEn },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'nextCharge',
      header: 'Next Charge',
      render: (row) =>
        row.nextChargeAt ? new Date(row.nextChargeAt).toLocaleDateString('en-IN') : '—',
    },
    {
      key: 'started',
      header: 'Started',
      render: (row) => new Date(row.startDate).toLocaleDateString('en-IN'),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            render: (row: DonorSubscription) =>
              row.status !== 'cancelled' && row.status !== 'completed' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setCancelTarget(row);
                  }}
                >
                  <Ban className="size-4" /> Cancel
                </Button>
              ) : null,
          } satisfies DataTableColumn<DonorSubscription>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Monthly Donors"
        description="Automatic-monthly contribution mandates (Razorpay Subscriptions) — separate from the one-time and manual-monthly donations already shown in Donations."
        breadcrumb={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Donations', href: '/admin/donations' },
          { label: 'Monthly Donors' },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="created">Created (unauthorized)</SelectItem>
            <SelectItem value="authenticated">Authenticated</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="halted">Halted</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No monthly donors found"
        emptyDescription="Automatic-monthly subscriptions will appear here once a donor authorizes one."
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this monthly contribution?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  This cancels {cancelTarget.donor.name}&apos;s {currency(cancelTarget.amount)}{' '}
                  monthly mandate at Razorpay immediately. Already-completed charges are unaffected.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
              disabled={cancelMutation.isPending}
            >
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
