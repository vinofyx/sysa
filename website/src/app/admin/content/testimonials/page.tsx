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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  quoteEn: string;
  quoteTe: string | null;
  photoUrl: string | null;
  displayOrder: number;
  active: boolean;
}

const testimonialSchema = z.object({
  authorName: z.string().min(1, 'Required').max(150),
  authorRole: z.string().max(150).optional().or(z.literal('')),
  quoteEn: z.string().min(1, 'Required').max(2000),
  quoteTe: z.string().max(2000).optional().or(z.literal('')),
  photoUrl: z.string().optional().or(z.literal('')),
  displayOrder: z.coerce.number().int(),
  active: z.boolean(),
});

type TestimonialFormValues = z.infer<typeof testimonialSchema>;

const EMPTY_VALUES: TestimonialFormValues = {
  authorName: '',
  authorRole: '',
  quoteEn: '',
  quoteTe: '',
  photoUrl: '',
  displayOrder: 0,
  active: true,
};

const resource = createResourceHooks<
  Testimonial,
  TestimonialFormValues,
  Partial<TestimonialFormValues>
>({
  resourceKey: 'testimonials',
  basePath: '/testimonials',
});

export default function TestimonialsPage() {
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Testimonial | null>(null);
  const [deleting, setDeleting] = React.useState<Testimonial | null>(null);

  const canManage = useHasPermission('testimonials:manage');
  const { data, isLoading } = resource.useList({ page, pageSize: 10 });
  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(row: Testimonial) {
    setEditing(row);
    form.reset({
      authorName: row.authorName,
      authorRole: row.authorRole ?? '',
      quoteEn: row.quoteEn,
      quoteTe: row.quoteTe ?? '',
      photoUrl: row.photoUrl ?? '',
      displayOrder: row.displayOrder,
      active: row.active,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: TestimonialFormValues) {
    const payload = {
      ...values,
      authorRole: values.authorRole || undefined,
      quoteTe: values.quoteTe || undefined,
      photoUrl: values.photoUrl || undefined,
    };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Testimonial updated' : 'Testimonial created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Testimonial removed');
        setDeleting(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<Testimonial>[] = [
    {
      key: 'author',
      header: 'Author',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarImage src={row.photoUrl ?? undefined} alt={row.authorName} />
            <AvatarFallback>{row.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.authorName}</p>
            {row.authorRole && <p className="text-muted-foreground text-xs">{row.authorRole}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'quote',
      header: 'Quote',
      className: 'max-w-md whitespace-normal',
      render: (row) => <p className="text-muted-foreground line-clamp-2 text-sm">{row.quoteEn}</p>,
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
        title="Testimonials"
        description="Donor and volunteer testimonials shown on the homepage."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Testimonials' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add testimonial
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No testimonials yet"
        emptyDescription="Add the first testimonial to feature it on the homepage."
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
        title={editing ? 'Edit testimonial' : 'Add testimonial'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="photoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Photo</FormLabel>
                <FormControl>
                  <ImageUploadField value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authorName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authorRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role / relationship (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Monthly Donor" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quoteEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quote (English)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quoteTe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quote (Telugu, optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
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
        title="Remove this testimonial?"
        description={`"${deleting?.authorName}" will be permanently hidden from the site.`}
        confirmLabel="Remove"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
