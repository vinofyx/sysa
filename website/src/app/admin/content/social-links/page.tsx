'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Globe, MessageCircle } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { FormDialog } from '@/components/admin/form-dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'linkedin' | 'whatsapp';

interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  displayOrder: number;
  active: boolean;
}

const PLATFORM_META: Record<SocialPlatform, { label: string; icon: typeof Globe }> = {
  facebook: { label: 'Facebook', icon: Globe },
  instagram: { label: 'Instagram', icon: Globe },
  twitter: { label: 'Twitter / X', icon: Globe },
  youtube: { label: 'YouTube', icon: Globe },
  linkedin: { label: 'LinkedIn', icon: Globe },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
};

const socialLinkSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'whatsapp']),
  url: z.string().url('A valid URL is required'),
  displayOrder: z.coerce.number().int(),
  active: z.boolean(),
});

type SocialLinkFormValues = z.infer<typeof socialLinkSchema>;

const EMPTY_VALUES: SocialLinkFormValues = {
  platform: 'facebook',
  url: '',
  displayOrder: 0,
  active: true,
};

const resource = createResourceHooks<
  SocialLink,
  SocialLinkFormValues,
  Partial<SocialLinkFormValues>
>({
  resourceKey: 'social-links',
  basePath: '/social-links',
});

export default function SocialLinksPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SocialLink | null>(null);
  const [deleting, setDeleting] = React.useState<SocialLink | null>(null);

  const canManage = useHasPermission('social_links:manage');
  const { data, isLoading } = resource.useList({ page: 1, pageSize: 20 });
  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const form = useForm<SocialLinkFormValues>({
    resolver: zodResolver(socialLinkSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(row: SocialLink) {
    setEditing(row);
    form.reset({
      platform: row.platform,
      url: row.url,
      displayOrder: row.displayOrder,
      active: row.active,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: SocialLinkFormValues) {
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: values })
      : createMutation.mutateAsync(values);

    mutation
      .then(() => {
        toast.success(editing ? 'Social link updated' : 'Social link created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Social link removed');
        setDeleting(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<SocialLink>[] = [
    {
      key: 'platform',
      header: 'Platform',
      render: (row) => {
        const meta = PLATFORM_META[row.platform];
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2 font-medium">
            <Icon className="size-4" /> {meta.label}
          </div>
        );
      },
    },
    {
      key: 'url',
      header: 'URL',
      render: (row) => (
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary max-w-xs truncate hover:underline"
        >
          {row.url}
        </a>
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
        title="Social Media Links"
        description="Links shown in the site header and footer."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Social Links' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add link
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No social links yet"
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

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit social link' : 'Add social link'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!!editing}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(PLATFORM_META).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>
                        {meta.label}
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
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://facebook.com/…" />
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
        title="Remove this social link?"
        description={`The ${deleting ? PLATFORM_META[deleting.platform].label : ''} link will be removed.`}
        confirmLabel="Remove"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
