'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Ban } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { FormDialog } from '@/components/admin/form-dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

interface DonationCategory {
  id: string;
  code: string;
  nameEn: string;
  descriptionEn: string | null;
  hasPresetTiers: boolean;
  active: boolean;
}

const categorySchema = z.object({
  code: z
    .string()
    .min(1, 'Required')
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Uppercase letters, numbers, and underscores only'),
  nameEn: z.string().min(1, 'Required').max(150),
  descriptionEn: z.string().max(2000).optional().or(z.literal('')),
  hasPresetTiers: z.boolean(),
  active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const EMPTY_VALUES: CategoryFormValues = {
  code: '',
  nameEn: '',
  descriptionEn: '',
  hasPresetTiers: false,
  active: true,
};

const resource = createResourceHooks<
  DonationCategory,
  CategoryFormValues,
  Partial<CategoryFormValues>
>({
  resourceKey: 'donation-categories',
  basePath: '/donation-categories',
});

export default function DonationCategoriesPage() {
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DonationCategory | null>(null);
  const [deactivating, setDeactivating] = React.useState<DonationCategory | null>(null);

  const canManage = useHasPermission('donations:manage');
  const { data, isLoading } = resource.useList({ page, pageSize: 20 });
  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(row: DonationCategory) {
    setEditing(row);
    form.reset({
      code: row.code,
      nameEn: row.nameEn,
      descriptionEn: row.descriptionEn ?? '',
      hasPresetTiers: row.hasPresetTiers,
      active: row.active,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: CategoryFormValues) {
    const payload = { ...values, descriptionEn: values.descriptionEn || undefined };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Category updated' : 'Category created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDeactivate() {
    if (!deactivating) return;
    deleteMutation.mutate(deactivating.id, {
      onSuccess: () => {
        toast.success('Category deactivated');
        setDeactivating(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<DonationCategory>[] = [
    {
      key: 'name',
      header: 'Category',
      render: (row) => (
        <div>
          <p className="font-medium">{row.nameEn}</p>
          <p className="text-muted-foreground text-xs">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'tiers',
      header: 'Preset tiers',
      render: (row) => (row.hasPresetTiers ? 'Yes' : 'No'),
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <span
          className={row.active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Donation Categories"
        description="Fixed categories donors can give toward (e.g. Annadanam, Education)."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Donation Categories' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add category
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No donation categories yet"
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
                  {row.active && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeactivating(row)}
                      aria-label="Deactivate"
                    >
                      <Ban />
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
        title={editing ? 'Edit category' : 'Add category'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
      >
        <Form {...form}>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ANNADANAM" disabled={!!editing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
          <div className="flex items-center gap-6">
            <FormField
              control={form.control}
              name="hasPresetTiers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Has preset amount tiers</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Active</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </Form>
      </FormDialog>

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate this category?"
        description={`"${deactivating?.nameEn}" will be hidden from the public donation form. Existing donations are unaffected.`}
        confirmLabel="Deactivate"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
