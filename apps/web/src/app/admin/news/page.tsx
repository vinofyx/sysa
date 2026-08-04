'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

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

type PostStatus = 'draft' | 'published' | 'archived';

interface NewsPost {
  id: string;
  titleEn: string;
  slug: string;
  bodyEn: string | null;
  status: PostStatus;
  featuredImageUrl: string | null;
  category: string | null;
  tags: string[];
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const newsSchema = z.object({
  titleEn: z.string().min(1, 'Required').max(200),
  slug: z
    .string()
    .min(1, 'Required')
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  bodyEn: z.string().max(20000).optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']),
  featuredImageUrl: z.string().optional().or(z.literal('')),
  category: z.string().max(100).optional().or(z.literal('')),
  tags: z.string().max(500).optional().or(z.literal('')),
  metaTitleEn: z.string().max(200).optional().or(z.literal('')),
  metaDescriptionEn: z.string().max(500).optional().or(z.literal('')),
});

type NewsFormValues = z.infer<typeof newsSchema>;

const EMPTY_VALUES: NewsFormValues = {
  titleEn: '',
  slug: '',
  bodyEn: '',
  status: 'draft',
  featuredImageUrl: '',
  category: '',
  tags: '',
  metaTitleEn: '',
  metaDescriptionEn: '',
};

const resource = createResourceHooks<NewsPost>({ resourceKey: 'news', basePath: '/news' });

export default function NewsPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NewsPost | null>(null);
  const [deleting, setDeleting] = React.useState<NewsPost | null>(null);

  const canManage = useHasPermission('news:manage');
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = resource.useList({
    page,
    pageSize: 10,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== 'all' ? { status } : {}),
  });
  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const form = useForm<NewsFormValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(row: NewsPost) {
    setEditing(row);
    form.reset({
      titleEn: row.titleEn,
      slug: row.slug,
      bodyEn: row.bodyEn ?? '',
      status: row.status,
      featuredImageUrl: row.featuredImageUrl ?? '',
      category: row.category ?? '',
      tags: row.tags.join(', '),
      metaTitleEn: row.metaTitleEn ?? '',
      metaDescriptionEn: row.metaDescriptionEn ?? '',
    });
    setDialogOpen(true);
  }

  function onSubmit(values: NewsFormValues) {
    const payload = {
      ...values,
      bodyEn: values.bodyEn || undefined,
      featuredImageUrl: values.featuredImageUrl || undefined,
      category: values.category || undefined,
      tags: values.tags
        ? values.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      metaTitleEn: values.metaTitleEn || undefined,
      metaDescriptionEn: values.metaDescriptionEn || undefined,
    };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Post updated' : 'Post created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Post removed');
        setDeleting(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<NewsPost>[] = [
    {
      key: 'title',
      header: 'Post',
      render: (row) => (
        <div>
          <p className="font-medium">{row.titleEn}</p>
          <p className="text-muted-foreground text-xs">/{row.slug}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'date',
      header: 'Published',
      render: (row) =>
        row.publishedAt ? (
          new Date(row.publishedAt).toLocaleDateString('en-IN')
        ) : (
          <span className="text-muted-foreground">Not published</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="News"
        description="News and blog posts."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'News' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add post
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search posts…"
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
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No posts yet"
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
        title={editing ? 'Edit post' : 'Add post'}
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
                    <Input {...field} placeholder="annual-report-2026" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="bodyEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body</FormLabel>
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Updates" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated, optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="annadanam, goshala" />
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
                    <SelectItem value="archived">Archived</SelectItem>
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

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this post?"
        description={`"${deleting?.titleEn}" will be removed from the site.`}
        confirmLabel="Remove"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
