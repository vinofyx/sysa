'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { FormDialog } from '@/components/admin/form-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createResourceHooks, apiErrorMessage } from '@/hooks/use-resource';
import { useHasPermission } from '@/hooks/use-permission';

type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

interface Volunteer {
  id: string;
  name: string;
  email: string;
}

interface VolunteerAssignment {
  id: string;
  titleEn: string;
  descriptionEn: string | null;
  assignedDate: string;
  status: AssignmentStatus;
  notes: string | null;
  volunteer: Volunteer;
}

const createSchema = z.object({
  volunteerId: z.string().min(1, 'Required'),
  titleEn: z.string().min(1, 'Required').max(200),
  descriptionEn: z.string().max(2000).optional().or(z.literal('')),
  assignedDate: z.string().min(1, 'Required'),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

const editSchema = z.object({
  titleEn: z.string().min(1, 'Required').max(200),
  descriptionEn: z.string().max(2000).optional().or(z.literal('')),
  status: z.enum(['assigned', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const EMPTY_CREATE: CreateFormValues = {
  volunteerId: '',
  titleEn: '',
  descriptionEn: '',
  assignedDate: '',
  notes: '',
};

const resource = createResourceHooks<VolunteerAssignment>({
  resourceKey: 'volunteer-assignments',
  basePath: '/volunteer-assignments',
});
const volunteerResource = createResourceHooks<Volunteer>({
  resourceKey: 'volunteers',
  basePath: '/volunteers',
});

function AssignmentsBody() {
  const searchParams = useSearchParams();
  const volunteerIdFilter = searchParams.get('volunteerId') ?? undefined;

  const [page, setPage] = React.useState(1);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<VolunteerAssignment | null>(null);

  const canManage = useHasPermission('volunteer_assignments:manage');
  const { data, isLoading } = resource.useList({
    page,
    pageSize: 15,
    ...(volunteerIdFilter ? { volunteerId: volunteerIdFilter } : {}),
  });
  const { data: volunteerData } = volunteerResource.useList({ page: 1, pageSize: 100 });
  const volunteers = React.useMemo(() => volunteerData?.data ?? [], [volunteerData]);

  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: EMPTY_CREATE,
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { titleEn: '', descriptionEn: '', status: 'assigned', notes: '' },
  });

  function openCreate() {
    createForm.reset(EMPTY_CREATE);
    setCreateOpen(true);
  }

  function openEdit(row: VolunteerAssignment) {
    setEditing(row);
    editForm.reset({
      titleEn: row.titleEn,
      descriptionEn: row.descriptionEn ?? '',
      status: row.status,
      notes: row.notes ?? '',
    });
  }

  function onCreate(values: CreateFormValues) {
    const payload = {
      ...values,
      descriptionEn: values.descriptionEn || undefined,
      notes: values.notes || undefined,
    };
    createMutation
      .mutateAsync(payload)
      .then(() => {
        toast.success('Task assigned');
        setCreateOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function onEdit(values: EditFormValues) {
    if (!editing) return;
    const payload = {
      ...values,
      descriptionEn: values.descriptionEn || undefined,
      notes: values.notes || undefined,
    };
    updateMutation
      .mutateAsync({ id: editing.id, input: payload })
      .then(() => {
        toast.success('Assignment updated');
        setEditing(null);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  const columns: DataTableColumn<VolunteerAssignment>[] = [
    {
      key: 'task',
      header: 'Task',
      render: (row) => (
        <div>
          <p className="font-medium">{row.titleEn}</p>
          <p className="text-muted-foreground text-xs">{row.volunteer.name}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Assigned date',
      render: (row) => new Date(row.assignedDate).toLocaleDateString('en-IN'),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Volunteer Assignments"
        description={
          volunteerIdFilter
            ? 'Filtered to a specific volunteer.'
            : 'Task assignments for approved volunteers.'
        }
        breadcrumb={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Volunteers', href: '/admin/volunteers' },
          { label: 'Assignments' },
        ]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Assign task
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No assignments yet"
        rowActions={
          canManage
            ? (row) => (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(row)}
                  aria-label="Edit"
                >
                  <Pencil />
                </Button>
              )
            : undefined
        }
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Assign a task"
        onSubmit={createForm.handleSubmit(onCreate)}
        isPending={createMutation.isPending}
      >
        <Form {...createForm}>
          <FormField
            control={createForm.control}
            name="volunteerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Volunteer</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select volunteer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {volunteers.map((volunteer) => (
                      <SelectItem key={volunteer.id} value={volunteer.id}>
                        {volunteer.name} ({volunteer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="titleEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="descriptionEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="assignedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Update assignment"
        onSubmit={editForm.handleSubmit(onEdit)}
        isPending={updateMutation.isPending}
      >
        <Form {...editForm}>
          <FormField
            control={editForm.control}
            name="titleEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={editForm.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={editForm.control}
            name="descriptionEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={editForm.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </FormDialog>
    </div>
  );
}

export default function VolunteerAssignmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <AssignmentsBody />
    </Suspense>
  );
}
