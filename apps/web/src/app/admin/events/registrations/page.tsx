'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { AxiosError } from 'axios';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { createResourceHooks, apiErrorMessage } from '@/hooks/use-resource';
import { useHasPermission } from '@/hooks/use-permission';

type RegistrationStatus = 'registered' | 'cancelled' | 'waitlisted';

interface EventRegistration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: RegistrationStatus;
  checkedIn: boolean;
  registeredAt: string;
  event: { titleEn: string };
}

const resource = createResourceHooks<EventRegistration>({
  resourceKey: 'event-registrations',
  basePath: '/event-registrations',
});

function RegistrationsBody() {
  const searchParams = useSearchParams();
  const eventIdFilter = searchParams.get('eventId') ?? undefined;

  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('all');

  const canManage = useHasPermission('event_registrations:manage');
  const queryClient = useQueryClient();
  const { data, isLoading } = resource.useList({
    page,
    pageSize: 15,
    ...(eventIdFilter ? { eventId: eventIdFilter } : {}),
    ...(status !== 'all' ? { status } : {}),
  });

  const checkInMutation = useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      await apiClient.post(`/event-registrations/${id}/check-in`);
    },
    onSuccess: () => {
      toast.success('Checked in');
      void queryClient.invalidateQueries({ queryKey: resource.keys.all });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const cancelMutation = useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      await apiClient.post(`/event-registrations/${id}/cancel`);
    },
    onSuccess: () => {
      toast.success('Registration cancelled — next waitlisted guest promoted, if any');
      void queryClient.invalidateQueries({ queryKey: resource.keys.all });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const columns: DataTableColumn<EventRegistration>[] = [
    {
      key: 'guest',
      header: 'Guest',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-muted-foreground text-xs">{row.email}</p>
        </div>
      ),
    },
    { key: 'event', header: 'Event', render: (row) => row.event.titleEn },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'checkedIn',
      header: 'Checked in',
      render: (row) =>
        row.checkedIn ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-4" /> Yes
          </span>
        ) : (
          <span className="text-muted-foreground">No</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Event Registrations"
        description="Attendee registrations, waitlist, and check-in."
        breadcrumb={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Events', href: '/admin/events' },
          { label: 'Registrations' },
        ]}
      />

      <div className="mb-4">
        <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No registrations found"
        rowActions={
          canManage
            ? (row) =>
                row.status === 'registered' ? (
                  <>
                    {!row.checkedIn && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => checkInMutation.mutate(row.id)}
                        aria-label="Check in"
                      >
                        <CheckCircle2 />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => cancelMutation.mutate(row.id)}
                      aria-label="Cancel"
                    >
                      <XCircle className="text-destructive" />
                    </Button>
                  </>
                ) : null
            : undefined
        }
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default function EventRegistrationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RegistrationsBody />
    </Suspense>
  );
}
