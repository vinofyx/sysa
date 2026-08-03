'use client';

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Settings, Users } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { SearchInput } from '@/components/admin/search-input';
import { FormDialog } from '@/components/admin/form-dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useDebouncedValue } from '@/hooks/use-debounced-value';

type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

interface EventCategory {
  id: string;
  nameEn: string;
}

interface EventRow {
  id: string;
  titleEn: string;
  slug: string;
  descriptionEn: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  capacity: number | null;
  registrationDeadline: string | null;
  featuredImageUrl: string | null;
  status: EventStatus;
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
  category: EventCategory | null;
  _count: { registrations: number };
}

const NONE_CATEGORY = '__none__';

const eventSchema = z.object({
  categoryId: z.string(),
  titleEn: z.string().min(1, 'Required').max(200),
  slug: z
    .string()
    .min(1, 'Required')
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  descriptionEn: z.string().max(5000).optional().or(z.literal('')),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().optional().or(z.literal('')),
  location: z.string().max(300).optional().or(z.literal('')),
  capacity: z.coerce.number().int().positive().optional().or(z.literal(0)),
  registrationDeadline: z.string().optional().or(z.literal('')),
  featuredImageUrl: z.string().optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']),
  metaTitleEn: z.string().max(200).optional().or(z.literal('')),
  metaDescriptionEn: z.string().max(500).optional().or(z.literal('')),
});

type EventFormValues = z.infer<typeof eventSchema>;

const EMPTY_VALUES: EventFormValues = {
  categoryId: NONE_CATEGORY,
  titleEn: '',
  slug: '',
  descriptionEn: '',
  startDate: '',
  endDate: '',
  location: '',
  capacity: 0,
  registrationDeadline: '',
  featuredImageUrl: '',
  status: 'draft',
  metaTitleEn: '',
  metaDescriptionEn: '',
};

const resource = createResourceHooks<EventRow>({ resourceKey: 'events', basePath: '/events' });
const categoryResource = createResourceHooks<EventCategory & { active: boolean; slug: string }>({
  resourceKey: 'event-categories',
  basePath: '/event-categories',
});

const categorySchema = z.object({
  nameEn: z.string().min(1, 'Required').max(150),
  slug: z
    .string()
    .min(1, 'Required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  active: z.boolean(),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

function ManageCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = categoryResource.useList({ page: 1, pageSize: 100 });
  const createMutation = categoryResource.useCreate();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { nameEn: '', slug: '', active: true },
  });

  function onSubmit(values: CategoryFormValues) {
    createMutation
      .mutateAsync(values)
      .then(() => {
        toast.success('Category added');
        form.reset({ nameEn: '', slug: '', active: true });
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Event Categories</DialogTitle>
          <DialogDescription>Categories used to classify events.</DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
          {(data?.data ?? []).map((category) => (
            <li key={category.id} className="rounded-md border px-3 py-1.5 text-sm">
              {category.nameEn}
            </li>
          ))}
          {data?.data.length === 0 && (
            <p className="text-muted-foreground text-sm">No categories yet.</p>
          )}
        </ul>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
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
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="fundraisers" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" size="sm" className="w-fit" disabled={createMutation.isPending}>
              <Plus /> Add category
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function EventsPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EventRow | null>(null);
  const [deleting, setDeleting] = React.useState<EventRow | null>(null);

  const canManage = useHasPermission('events:manage');
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = resource.useList({
    page,
    pageSize: 10,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== 'all' ? { status } : {}),
  });
  const { data: categoryData } = categoryResource.useList({ page: 1, pageSize: 100 });
  const categories = React.useMemo(() => categoryData?.data ?? [], [categoryData]);

  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function toLocalInput(iso: string | null) {
    if (!iso) return '';
    return iso.slice(0, 16);
  }

  function openEdit(row: EventRow) {
    setEditing(row);
    form.reset({
      categoryId: row.category?.id ?? NONE_CATEGORY,
      titleEn: row.titleEn,
      slug: row.slug,
      descriptionEn: row.descriptionEn ?? '',
      startDate: toLocalInput(row.startDate),
      endDate: toLocalInput(row.endDate),
      location: row.location ?? '',
      capacity: row.capacity ?? 0,
      registrationDeadline: toLocalInput(row.registrationDeadline),
      featuredImageUrl: row.featuredImageUrl ?? '',
      status: row.status,
      metaTitleEn: row.metaTitleEn ?? '',
      metaDescriptionEn: row.metaDescriptionEn ?? '',
    });
    setDialogOpen(true);
  }

  function onSubmit(values: EventFormValues) {
    const payload = {
      ...values,
      categoryId: values.categoryId === NONE_CATEGORY ? undefined : values.categoryId,
      descriptionEn: values.descriptionEn || undefined,
      endDate: values.endDate || undefined,
      location: values.location || undefined,
      capacity: values.capacity || undefined,
      registrationDeadline: values.registrationDeadline || undefined,
      featuredImageUrl: values.featuredImageUrl || undefined,
      metaTitleEn: values.metaTitleEn || undefined,
      metaDescriptionEn: values.metaDescriptionEn || undefined,
    };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Event updated' : 'Event created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Event removed');
        setDeleting(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<EventRow>[] = [
    {
      key: 'title',
      header: 'Event',
      render: (row) => (
        <div>
          <p className="font-medium">{row.titleEn}</p>
          <p className="text-muted-foreground text-xs">{row.category?.nameEn ?? 'Uncategorized'}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Start date',
      render: (row) => new Date(row.startDate).toLocaleString('en-IN'),
    },
    {
      key: 'registrations',
      header: 'Registrations',
      render: (row) => (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          render={<Link href={`/admin/events/registrations?eventId=${row.id}`} />}
        >
          <Users className="size-3.5" /> {row._count.registrations}
          {row.capacity ? ` / ${row.capacity}` : ''}
        </Button>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Events"
        description="Manage upcoming and past Ashram events."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Events' }]}
        action={
          canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCategoriesDialogOpen(true)}>
                <Settings /> Categories
              </Button>
              <Button onClick={openCreate}>
                <Plus /> Add event
              </Button>
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search events…"
          className="w-64"
        />
        <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No events yet"
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
        title={editing ? 'Edit event' : 'Add event'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
        className="max-w-2xl"
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="featuredImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Featured image</FormLabel>
                <FormControl>
                  <ImageUploadField value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
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
                    <Input {...field} placeholder="annual-day" />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <RichTextEditor value={field.value ?? ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_CATEGORY}>Uncategorized</SelectItem>
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date &amp; time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                  <FormLabel>End date &amp; time (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (optional)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registrationDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration deadline (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <FormField
              control={form.control}
              name="metaTitleEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO meta title (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metaDescriptionEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO meta description (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </FormDialog>

      <ManageCategoriesDialog open={categoriesDialogOpen} onOpenChange={setCategoriesDialogOpen} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this event?"
        description={`"${deleting?.titleEn}" will be removed from the site.`}
        confirmLabel="Remove"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
