'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { SearchInput } from '@/components/admin/search-input';
import { FormDialog } from '@/components/admin/form-dialog';
import { Badge } from '@/components/ui/badge';
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
import { apiErrorMessage } from '@/hooks/use-resource';
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/use-users';
import { useRoles } from '@/hooks/use-roles';
import { useHasPermission } from '@/hooks/use-permission';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { AdminUserSummary } from '@/types/auth';

const createSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(120),
  email: z.string().email('Valid email required'),
  roleId: z.string().min(1, 'Required'),
});

const editSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(120),
  roleId: z.string().min(1, 'Required'),
  active: z.boolean(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

export default function UsersPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminUserSummary | null>(null);

  const canManage = useHasPermission('users:manage');
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = useUsers({
    page,
    pageSize: 15,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const { data: roles } = useRoles();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', roleId: '' },
  });
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', roleId: '', active: true },
  });

  function openCreate() {
    createForm.reset({ name: '', email: '', roleId: '' });
    setCreateOpen(true);
  }

  function openEdit(row: AdminUserSummary) {
    setEditing(row);
    editForm.reset({ name: row.name, roleId: row.roleId, active: row.active });
  }

  function onCreate(values: CreateFormValues) {
    createMutation
      .mutateAsync(values)
      .then(() => {
        toast.success('User created — a verification email has been sent');
        setCreateOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function onEdit(values: EditFormValues) {
    if (!editing) return;
    updateMutation
      .mutateAsync({ id: editing.id, input: values })
      .then(() => {
        toast.success('User updated');
        setEditing(null);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  const columns: DataTableColumn<AdminUserSummary>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-muted-foreground text-xs">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge variant="secondary">{row.roleName}</Badge>,
    },
    {
      key: 'verified',
      header: 'Email verified',
      render: (row) => (row.emailVerified ? 'Yes' : 'No'),
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
    {
      key: 'lastLogin',
      header: 'Last login',
      render: (row) =>
        row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString('en-IN') : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Admin user accounts and role assignments."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Users' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Add user
            </Button>
          )
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or email…"
          className="w-72"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No users found"
        rowActions={
          canManage
            ? (row) => (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(row)}
                  aria-label="Edit"
                >
                  <Pencil />
                </Button>
              )
            : undefined
        }
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add user"
        description="Sends an email-verification link — the new user sets their own password."
        onSubmit={createForm.handleSubmit(onCreate)}
        isPending={createMutation.isPending}
      >
        <Form {...createForm}>
          <FormField
            control={createForm.control}
            name="name"
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
            control={createForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(roles ?? []).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit user"
        onSubmit={editForm.handleSubmit(onEdit)}
        isPending={updateMutation.isPending}
      >
        <Form {...editForm}>
          <FormField
            control={editForm.control}
            name="name"
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
            control={editForm.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(roles ?? []).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={editForm.control}
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
        </Form>
      </FormDialog>
    </div>
  );
}
