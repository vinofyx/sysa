'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';
import type { AxiosError } from 'axios';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { createResourceHooks, apiErrorMessage } from '@/hooks/use-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useHasPermission } from '@/hooks/use-permission';

type ApplicationStatus = 'submitted' | 'under_review' | 'accepted' | 'not_selected';

interface VolunteerApplication {
  id: string;
  type: 'volunteer' | 'internship';
  areaOfInterest: string | null;
  status: ApplicationStatus;
  submittedAt: string;
  volunteer: { name: string; email: string; phone: string };
}

interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
  applications: { id: string }[];
}

const applicationResource = createResourceHooks<VolunteerApplication>({
  resourceKey: 'volunteer-applications',
  basePath: '/volunteers/applications/list',
});
const volunteerResource = createResourceHooks<Volunteer>({
  resourceKey: 'volunteers',
  basePath: '/volunteers',
});

function ApplicationsTab() {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('all');
  const [reviewing, setReviewing] = React.useState<VolunteerApplication | null>(null);
  const [nextStatus, setNextStatus] = React.useState<ApplicationStatus>('accepted');
  const [note, setNote] = React.useState('');

  const canManage = useHasPermission('volunteers:manage_status');
  const queryClient = useQueryClient();
  const { data, isLoading } = applicationResource.useList({
    page,
    pageSize: 15,
    ...(status !== 'all' ? { status } : {}),
  });

  const statusMutation = useMutation<
    void,
    AxiosError<ApiErrorBody>,
    { id: string; status: ApplicationStatus; internalNote?: string }
  >({
    mutationFn: async ({ id, status: newStatus, internalNote }) => {
      await apiClient.patch(`/volunteers/applications/${id}/status`, {
        status: newStatus,
        internalNote,
      });
    },
    onSuccess: () => {
      toast.success('Application status updated');
      setReviewing(null);
      setNote('');
      void queryClient.invalidateQueries({ queryKey: applicationResource.keys.all });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function openReview(row: VolunteerApplication, target: ApplicationStatus) {
    setReviewing(row);
    setNextStatus(target);
    setNote('');
  }

  const columns: DataTableColumn<VolunteerApplication>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (row) => (
        <div>
          <p className="font-medium">{row.volunteer.name}</p>
          <p className="text-muted-foreground text-xs">{row.volunteer.email}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <span className="capitalize">{row.type}</span>,
    },
    {
      key: 'interest',
      header: 'Area of interest',
      render: (row) => row.areaOfInterest || <span className="text-muted-foreground">—</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (row) => new Date(row.submittedAt).toLocaleDateString('en-IN'),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="not_selected">Not selected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No applications found"
        rowActions={
          canManage
            ? (row) =>
                row.status === 'submitted' || row.status === 'under_review' ? (
                  <>
                    {row.status === 'submitted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReview(row, 'under_review')}
                      >
                        Review
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openReview(row, 'accepted')}>
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReview(row, 'not_selected')}
                    >
                      Reject
                    </Button>
                  </>
                ) : null
            : undefined
        }
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nextStatus === 'accepted' && 'Accept application'}
              {nextStatus === 'not_selected' && 'Reject application'}
              {nextStatus === 'under_review' && 'Mark as under review'}
            </DialogTitle>
            <DialogDescription>
              {reviewing?.volunteer.name} — {reviewing?.type}
              {nextStatus === 'accepted' &&
                '. This creates a Volunteer profile if one does not exist.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Internal note (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              variant={nextStatus === 'not_selected' ? 'destructive' : 'default'}
              disabled={statusMutation.isPending}
              onClick={() =>
                reviewing &&
                statusMutation.mutate({
                  id: reviewing.id,
                  status: nextStatus,
                  internalNote: note || undefined,
                })
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DirectoryTab() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = volunteerResource.useList({
    page,
    pageSize: 15,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  const columns: DataTableColumn<Volunteer>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-muted-foreground text-xs">{row.email}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone },
    {
      key: 'registered',
      header: 'Registered',
      render: (row) => new Date(row.registeredAt).toLocaleDateString('en-IN'),
    },
    {
      key: 'assignments',
      header: 'Assignments',
      render: (row) => (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          render={<Link href={`/admin/volunteers/assignments?volunteerId=${row.id}`} />}
        >
          <ClipboardList className="size-3.5" /> View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or email…"
          className="w-72"
        />
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No volunteers yet"
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default function VolunteersPage() {
  return (
    <div>
      <PageHeader
        title="Volunteer Management"
        description="Applications review and the registered volunteer directory."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Volunteers' }]}
      />
      <Tabs defaultValue="applications">
        <TabsList className="mb-4">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
        </TabsList>
        <TabsContent value="applications">
          <ApplicationsTab />
        </TabsContent>
        <TabsContent value="directory">
          <DirectoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
