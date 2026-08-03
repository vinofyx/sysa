'use client';

import * as React from 'react';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ImageOff } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { FormDialog } from '@/components/admin/form-dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface HeroBanner {
  id: string;
  titleEn: string;
  subtitleEn: string | null;
  imageUrl: string;
  ctaLabelEn: string | null;
  ctaUrl: string | null;
  displayOrder: number;
  active: boolean;
}

const heroBannerSchema = z.object({
  titleEn: z.string().min(1, 'Required').max(200),
  subtitleEn: z.string().max(400).optional().or(z.literal('')),
  imageUrl: z.string().url('Upload an image first'),
  ctaLabelEn: z.string().max(60).optional().or(z.literal('')),
  ctaUrl: z.string().max(500).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int(),
  active: z.boolean(),
});

type HeroBannerFormValues = z.infer<typeof heroBannerSchema>;

const EMPTY_VALUES: HeroBannerFormValues = {
  titleEn: '',
  subtitleEn: '',
  imageUrl: '',
  ctaLabelEn: '',
  ctaUrl: '',
  displayOrder: 0,
  active: true,
};

const resource = createResourceHooks<
  HeroBanner,
  HeroBannerFormValues,
  Partial<HeroBannerFormValues>
>({
  resourceKey: 'hero-banners',
  basePath: '/hero-banners',
});

export default function HeroBannersPage() {
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<HeroBanner | null>(null);
  const [deleting, setDeleting] = React.useState<HeroBanner | null>(null);

  const canManage = useHasPermission('banners:manage');
  const { data, isLoading } = resource.useList({ page, pageSize: 10 });
  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const form = useForm<HeroBannerFormValues>({
    resolver: zodResolver(heroBannerSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(row: HeroBanner) {
    setEditing(row);
    form.reset({
      titleEn: row.titleEn,
      subtitleEn: row.subtitleEn ?? '',
      imageUrl: row.imageUrl,
      ctaLabelEn: row.ctaLabelEn ?? '',
      ctaUrl: row.ctaUrl ?? '',
      displayOrder: row.displayOrder,
      active: row.active,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: HeroBannerFormValues) {
    const payload = {
      ...values,
      subtitleEn: values.subtitleEn || undefined,
      ctaLabelEn: values.ctaLabelEn || undefined,
      ctaUrl: values.ctaUrl || undefined,
    };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Banner updated' : 'Banner created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Banner removed');
        setDeleting(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<HeroBanner>[] = [
    {
      key: 'image',
      header: 'Banner',
      render: (row) =>
        row.imageUrl ? (
          <Image
            src={row.imageUrl}
            alt={row.titleEn}
            width={80}
            height={45}
            unoptimized
            className="h-11 w-20 rounded-md border object-cover"
          />
        ) : (
          <div className="bg-muted flex h-11 w-20 items-center justify-center rounded-md border">
            <ImageOff className="text-muted-foreground size-4" />
          </div>
        ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div>
          <p className="font-medium">{row.titleEn}</p>
          {row.subtitleEn && <p className="text-muted-foreground text-xs">{row.subtitleEn}</p>}
        </div>
      ),
    },
    {
      key: 'cta',
      header: 'CTA',
      render: (row) => row.ctaLabelEn || <span className="text-muted-foreground">—</span>,
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
        title="Hero Banners"
        description="Homepage hero carousel banners."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Hero Banners' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add banner
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No hero banners yet"
        emptyDescription="Add a banner to feature it on the homepage carousel."
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
        title={editing ? 'Edit banner' : 'Add banner'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banner image</FormLabel>
                <FormControl>
                  <ImageUploadField value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            name="subtitleEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subtitle (optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="ctaLabelEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button label (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Donate Now" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ctaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button link (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="/donate" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
        title="Remove this banner?"
        description={`"${deleting?.titleEn}" will be removed from the homepage carousel.`}
        confirmLabel="Remove"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
