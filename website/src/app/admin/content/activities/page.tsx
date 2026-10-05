'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { FormDialog } from '@/components/admin/form-dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

interface DonationCategory {
  id: string;
  nameEn: string;
}

interface Activity {
  id: string;
  slug: string;
  titleEn: string;
  descriptionEn: string | null;
  iconOrImageUrl: string | null;
  linkedCategoryId: string | null;
  displayOrder: number;
  active: boolean;
}

const NONE_CATEGORY = '__none__';

const activitySchema = z.object({
  slug: z
    .string()
    .min(1, 'Required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  titleEn: z.string().min(1, 'Required').max(200),
  descriptionEn: z.string().max(3000).optional().or(z.literal('')),
  iconOrImageUrl: z.string().optional().or(z.literal('')),
  linkedCategoryId: z.string(),
  displayOrder: z.coerce.number().int(),
  active: z.boolean(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

const EMPTY_VALUES: ActivityFormValues = {
  slug: '',
  titleEn: '',
  descriptionEn: '',
  iconOrImageUrl: '',
  linkedCategoryId: NONE_CATEGORY,
  displayOrder: 0,
  active: true,
};

const resource = createResourceHooks<Activity>({
  resourceKey: 'activities',
  basePath: '/activities',
});

const categoryResource = createResourceHooks<DonationCategory>({
  resourceKey: 'donation-categories',
  basePath: '/donation-categories',
});

export default function ActivitiesPage() {
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Activity | null>(null);
  const [deleting, setDeleting] = React.useState<Activity | null>(null);

  const canManage = useHasPermission('activities:manage');
  const { data, isLoading } = resource.useList({ page, pageSize: 10 });
  const { data: categoryData } = categoryResource.useList({ page: 1, pageSize: 100 });
  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const categories = React.useMemo(() => categoryData?.data ?? [], [categoryData]);
  const categoriesById = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(row: Activity) {
    setEditing(row);
    form.reset({
      slug: row.slug,
      titleEn: row.titleEn,
      descriptionEn: row.descriptionEn ?? '',
      iconOrImageUrl: row.iconOrImageUrl ?? '',
      linkedCategoryId: row.linkedCategoryId ?? NONE_CATEGORY,
      displayOrder: row.displayOrder,
      active: row.active,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: ActivityFormValues) {
    const payload = {
      ...values,
      descriptionEn: values.descriptionEn || undefined,
      iconOrImageUrl: values.iconOrImageUrl || undefined,
      linkedCategoryId:
        values.linkedCategoryId === NONE_CATEGORY ? undefined : values.linkedCategoryId,
    };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Activity updated' : 'Activity created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Activity removed');
        setDeleting(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<Activity>[] = [
    {
      key: 'title',
      header: 'Activity / Service',
      render: (row) => (
        <div>
          <p className="font-medium">{row.titleEn}</p>
          <p className="text-muted-foreground text-xs">/{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Linked donation category',
      render: (row) =>
        row.linkedCategoryId ? (
          (categoriesById.get(row.linkedCategoryId)?.nameEn ?? '—')
        ) : (
          <span className="text-muted-foreground">None</span>
        ),
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
        title="Activities & Services"
        description="Ashram programs and services — covers both the Activities and Services modules (one unified entity, see DEVELOPMENT_PROGRESS.md)."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Activities & Services' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add activity
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No activities yet"
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(row)}
                    aria-label="Delete"
                  >
                    <Trash2 />
                  </Button>
                </>
              )
            : undefined
        }
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit activity' : 'Add activity'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="iconOrImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image</FormLabel>
                <FormControl>
                  <ImageUploadField value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="goshala" />
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
                  <Textarea {...field} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="linkedCategoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked donation category (optional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_CATEGORY}>None</SelectItem>
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
          <div className="flex items-center gap-4">
            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Display order</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 pt-6">
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
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this activity?"
        description={`"${deleting?.titleEn}" will be removed from the site.`}
        confirmLabel="Remove"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
