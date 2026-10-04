'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Archive } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { FormDialog } from '@/components/admin/form-dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

type AppealStatus = 'active' | 'completed' | 'archived';

interface DonationCategory {
  id: string;
  nameEn: string;
  active: boolean;
}

interface Appeal {
  id: string;
  titleEn: string;
  descriptionEn: string | null;
  targetAmount: string;
  raisedAmountCache: string;
  status: AppealStatus;
  startDate: string | null;
  endDate: string | null;
  category: DonationCategory;
}

const appealSchema = z.object({
  categoryId: z.string().min(1, 'Required'),
  titleEn: z.string().min(1, 'Required').max(200),
  descriptionEn: z.string().max(3000).optional().or(z.literal('')),
  targetAmount: z.coerce.number().positive('Must be greater than 0'),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'completed', 'archived']),
});

type AppealFormValues = z.infer<typeof appealSchema>;

const EMPTY_VALUES: AppealFormValues = {
  categoryId: '',
  titleEn: '',
  descriptionEn: '',
  targetAmount: 0,
  startDate: '',
  endDate: '',
  status: 'active',
};

interface AppealPayload {
  categoryId: string;
  titleEn: string;
  descriptionEn?: string;
  targetAmount: number;
  startDate?: string;
  endDate?: string;
  status: AppealStatus;
}

const resource = createResourceHooks<Appeal, AppealPayload, Partial<AppealPayload>>({
  resourceKey: 'appeals',
  basePath: '/appeals',
});
const categoryResource = createResourceHooks<DonationCategory>({
  resourceKey: 'donation-categories',
  basePath: '/donation-categories',
});

function currency(value: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function DonationCampaignsPage() {
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Appeal | null>(null);
  const [archiving, setArchiving] = React.useState<Appeal | null>(null);

  const canManage = useHasPermission('appeals:manage');
  const { data, isLoading } = resource.useList({ page, pageSize: 10 });
  const { data: categoryData } = categoryResource.useList({ page: 1, pageSize: 100 });
  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const categories = React.useMemo(
    () => (categoryData?.data ?? []).filter((category) => category.active),
    [categoryData],
  );

  const form = useForm<AppealFormValues>({
    resolver: zodResolver(appealSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(row: Appeal) {
    setEditing(row);
    form.reset({
      categoryId: row.category.id,
      titleEn: row.titleEn,
      descriptionEn: row.descriptionEn ?? '',
      targetAmount: Number(row.targetAmount),
      startDate: row.startDate ? row.startDate.slice(0, 10) : '',
      endDate: row.endDate ? row.endDate.slice(0, 10) : '',
      status: row.status,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: AppealFormValues) {
    const payload = {
      ...values,
      descriptionEn: values.descriptionEn || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Campaign updated' : 'Campaign created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmArchive() {
    if (!archiving) return;
    deleteMutation.mutate(archiving.id, {
      onSuccess: () => {
        toast.success('Campaign archived');
        setArchiving(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<Appeal>[] = [
    {
      key: 'title',
      header: 'Campaign',
      render: (row) => (
        <div>
          <p className="font-medium">{row.titleEn}</p>
          <p className="text-muted-foreground text-xs">{row.category.nameEn}</p>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (row) => {
        const pct = Math.min(
          100,
          Math.round((Number(row.raisedAmountCache) / Number(row.targetAmount)) * 100) || 0,
        );
        return (
          <div className="w-40">
            <div className="mb-1 flex justify-between text-xs">
              <span>{currency(row.raisedAmountCache)}</span>
              <span className="text-muted-foreground">of {currency(row.targetAmount)}</span>
            </div>
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Donation Campaigns"
        description="Fundraising appeals with progress tracking against a target amount."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Donation Campaigns' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add campaign
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No campaigns yet"
        rowActions={
          canManage
            ? (row) => (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(row)}
                    aria-label="Edit"
                  >
                    <Pencil />
                  </Button>
                  {row.status !== 'archived' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setArchiving(row)}
                      aria-label="Archive"
                    >
                      <Archive />
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit campaign' : 'Add campaign'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="titleEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donation category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </FormDialog>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this campaign?"
        description={`"${archiving?.titleEn}" will no longer accept new donations.`}
        confirmLabel="Archive"
        isPending={deleteMutation.isPending}
        onConfirm={confirmArchive}
      />
    </div>
  );
}
