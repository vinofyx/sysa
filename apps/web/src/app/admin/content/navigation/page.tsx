'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

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

type NavLocation = 'header' | 'footer';

interface NavigationMenuItem {
  id: string;
  labelEn: string;
  labelTe: string | null;
  url: string;
  location: NavLocation;
  parentId: string | null;
  displayOrder: number;
  active: boolean;
}

const NONE_PARENT = '__none__';

const navItemSchema = z.object({
  labelEn: z.string().min(1, 'Required').max(80),
  labelTe: z.string().max(80).optional().or(z.literal('')),
  url: z.string().min(1, 'Required').max(500),
  location: z.enum(['header', 'footer']),
  parentId: z.string(),
  displayOrder: z.coerce.number().int(),
  active: z.boolean(),
});

type NavItemFormValues = z.infer<typeof navItemSchema>;

const EMPTY_VALUES: NavItemFormValues = {
  labelEn: '',
  labelTe: '',
  url: '',
  location: 'header',
  parentId: NONE_PARENT,
  displayOrder: 0,
  active: true,
};

const resource = createResourceHooks<NavigationMenuItem>({
  resourceKey: 'navigation-menu-items',
  basePath: '/navigation',
});

export default function NavigationMenusPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NavigationMenuItem | null>(null);
  const [deleting, setDeleting] = React.useState<NavigationMenuItem | null>(null);

  const canManage = useHasPermission('navigation:manage');
  const { data, isLoading } = resource.useList({ page: 1, pageSize: 100 });
  const createMutation = resource.useCreate();
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const items = React.useMemo(() => data?.data ?? [], [data]);
  const itemsById = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const form = useForm<NavItemFormValues>({
    resolver: zodResolver(navItemSchema),
    defaultValues: EMPTY_VALUES,
  });

  const watchedLocation = form.watch('location');
  const parentOptions = items.filter(
    (item) => item.location === watchedLocation && item.id !== editing?.id && !item.parentId,
  );

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(row: NavigationMenuItem) {
    setEditing(row);
    form.reset({
      labelEn: row.labelEn,
      labelTe: row.labelTe ?? '',
      url: row.url,
      location: row.location,
      parentId: row.parentId ?? NONE_PARENT,
      displayOrder: row.displayOrder,
      active: row.active,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: NavItemFormValues) {
    const payload = {
      ...values,
      labelTe: values.labelTe || undefined,
      parentId: values.parentId === NONE_PARENT ? undefined : values.parentId,
    };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Menu item updated' : 'Menu item created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Menu item removed');
        setDeleting(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<NavigationMenuItem>[] = [
    {
      key: 'label',
      header: 'Label',
      render: (row) => (
        <div className={row.parentId ? 'pl-4' : ''}>
          <p className="font-medium">
            {row.parentId && '↳ '}
            {row.labelEn}
          </p>
          <p className="text-muted-foreground text-xs">{row.url}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => <span className="capitalize">{row.location}</span>,
    },
    {
      key: 'parent',
      header: 'Parent',
      render: (row) =>
        row.parentId ? (
          (itemsById.get(row.parentId)?.labelEn ?? '—')
        ) : (
          <span className="text-muted-foreground">Top-level</span>
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
        title="Navigation Menus"
        description="Header and footer navigation links, with optional one-level nesting."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Navigation Menus' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add menu item
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={items}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No navigation items yet"
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
        title={editing ? 'Edit menu item' : 'Add menu item'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
      >
        <Form {...form}>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="labelEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="labelTe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label (Telugu, optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="/about" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent (optional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_PARENT}>Top-level</SelectItem>
                      {parentOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        title="Remove this menu item?"
        description={`"${deleting?.labelEn}" will be removed from the ${deleting?.location} menu.`}
        confirmLabel="Remove"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
