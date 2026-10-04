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
import { Badge } from '@/components/ui/badge';
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
import { apiErrorMessage } from '@/hooks/use-resource';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  usePermissionsCatalogue,
} from '@/hooks/use-roles';
import { useHasPermission } from '@/hooks/use-permission';
import type { Role } from '@/types/auth';

const roleSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(60),
  description: z.string().max(500).optional().or(z.literal('')),
  permissionCodes: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleSchema>;

const EMPTY_VALUES: RoleFormValues = { name: '', description: '', permissionCodes: [] };

const PROTECTED_ROLE_NAME = 'Super Admin';

export default function RolesPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Role | null>(null);
  const [deleting, setDeleting] = React.useState<Role | null>(null);

  const canManage = useHasPermission('roles:manage');
  const { data: roles, isLoading } = useRoles();
  const { data: permissions } = usePermissionsCatalogue();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();

  const groupedPermissions = React.useMemo(() => {
    const groups = new Map<string, { id: string; code: string; description: string | null }[]>();
    for (const permission of permissions ?? []) {
      const [group] = permission.code.split(':');
      const list = groups.get(group) ?? [];
      list.push(permission);
      groups.set(group, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function openEdit(role: Role) {
    setEditing(role);
    form.reset({
      name: role.name,
      description: role.description ?? '',
      permissionCodes: role.permissions.map((p) => p.code),
    });
    setDialogOpen(true);
  }

  function togglePermission(code: string, checked: boolean, current: string[]) {
    return checked ? [...current, code] : current.filter((c) => c !== code);
  }

  function onSubmit(values: RoleFormValues) {
    const payload = { ...values, description: values.description || undefined };
    const mutation = editing
      ? updateMutation.mutateAsync({ id: editing.id, input: payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editing ? 'Role updated' : 'Role created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Role deleted');
        setDeleting(null);
      },
      onError: (error) =>
        toast.error(
          apiErrorMessage(error, 'Could not delete — it may still be assigned to a user'),
        ),
    });
  }

  const columns: DataTableColumn<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description && <p className="text-muted-foreground text-xs">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (row) => <Badge variant="secondary">{row.permissions.length} permissions</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Configurable RBAC roles — permissions are fully database-driven."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Roles & Permissions' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add role
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={roles ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No roles yet"
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
                  {row.name !== PROTECTED_ROLE_NAME && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleting(row)}
                      aria-label="Delete"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit role' : 'Add role'}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending || updateMutation.isPending}
        className="max-w-2xl"
      >
        <Form {...form}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={editing?.name === PROTECTED_ROLE_NAME} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={1} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="permissionCodes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permissions</FormLabel>
                <div className="grid max-h-80 grid-cols-1 gap-x-6 gap-y-4 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                  {groupedPermissions.map(([group, perms]) => (
                    <div key={group} className="flex flex-col gap-1.5">
                      <p className="text-xs font-semibold tracking-wide capitalize uppercase">
                        {group.replace(/_/g, ' ')}
                      </p>
                      {perms.map((permission) => (
                        <label key={permission.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={field.value.includes(permission.code)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                togglePermission(permission.code, !!checked, field.value),
                              )
                            }
                          />
                          {permission.code}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this role?"
        description={`"${deleting?.name}" will be permanently deleted. This fails if any user still holds it.`}
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
