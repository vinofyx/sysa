'use client';

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Download, BarChart3 } from 'lucide-react';
import type { AxiosError } from 'axios';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { SearchInput } from '@/components/admin/search-input';
import { FormDialog } from '@/components/admin/form-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { createResourceHooks, apiErrorMessage } from '@/hooks/use-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useHasPermission } from '@/hooks/use-permission';

type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';
type PaymentMethod =
  'upi' | 'card' | 'netbanking' | 'wallet' | 'bank_transfer_manual' | 'cash' | 'cheque';

interface Donation {
  id: string;
  amount: string;
  currency: string;
  status: DonationStatus;
  source: 'online' | 'manual';
  frequency: 'one_time' | 'monthly';
  paymentMethod: PaymentMethod;
  createdAt: string;
  donor: { name: string; email: string };
  category: { nameEn: string };
  appeal: { titleEn: string } | null;
}

interface DonationCategory {
  id: string;
  nameEn: string;
}

const manualDonationSchema = z.object({
  donorName: z.string().min(1, 'Required').max(150),
  donorEmail: z.string().email('Valid email required'),
  donorPhone: z.string().max(20).optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be greater than 0'),
  paymentMethod: z.enum([
    'upi',
    'card',
    'netbanking',
    'wallet',
    'bank_transfer_manual',
    'cash',
    'cheque',
  ]),
  frequency: z.enum(['one_time', 'monthly']),
  internalNote: z.string().max(1000).optional().or(z.literal('')),
});

type ManualDonationFormValues = z.infer<typeof manualDonationSchema>;

const EMPTY_VALUES: ManualDonationFormValues = {
  donorName: '',
  donorEmail: '',
  donorPhone: '',
  categoryId: '',
  amount: 0,
  paymentMethod: 'cash',
  frequency: 'one_time',
  internalNote: '',
};

interface ManualDonationPayload {
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  categoryId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  frequency: 'one_time' | 'monthly';
  internalNote?: string;
}

const resource = createResourceHooks<Donation, ManualDonationPayload>({
  resourceKey: 'donations',
  basePath: '/donations',
});
const categoryResource = createResourceHooks<DonationCategory>({
  resourceKey: 'donation-categories',
  basePath: '/donation-categories',
});

function currency(value: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function DonationsPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const canCreateManual = useHasPermission('donations:create_manual');
  const canExport = useHasPermission('donations:export');
  const debouncedSearch = useDebouncedValue(search, 400);
  const queryClient = useQueryClient();

  const query = {
    page,
    pageSize: 15,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== 'all' ? { status } : {}),
  };
  const { data, isLoading } = resource.useList(query);
  const { data: categoryData } = categoryResource.useList({ page: 1, pageSize: 100 });
  const categories = React.useMemo(() => categoryData?.data ?? [], [categoryData]);

  const createMutation = useMutation<Donation, AxiosError<ApiErrorBody>, ManualDonationPayload>({
    mutationFn: async (input) => {
      const { data: response } = await apiClient.post<{ data: Donation }>(
        '/donations/manual',
        input,
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resource.keys.all });
    },
  });

  const form = useForm<ManualDonationFormValues>({
    resolver: zodResolver(manualDonationSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function onSubmit(values: ManualDonationFormValues) {
    const payload = {
      ...values,
      donorPhone: values.donorPhone || undefined,
      internalNote: values.internalNote || undefined,
    };
    createMutation
      .mutateAsync(payload)
      .then(() => {
        toast.success('Manual donation recorded');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  const exportMutation = useMutation<void, AxiosError<ApiErrorBody>, void>({
    mutationFn: async () => {
      const response = await apiClient.get('/donations/export', {
        params: status !== 'all' ? { status } : {},
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'donations.csv';
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Export failed')),
  });

  const columns: DataTableColumn<Donation>[] = [
    {
      key: 'donor',
      header: 'Donor',
      render: (row) => (
        <div>
          <p className="font-medium">{row.donor.name}</p>
          <p className="text-muted-foreground text-xs">{row.donor.email}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <div>
          <p className="font-medium">{currency(row.amount)}</p>
          <p className="text-muted-foreground text-xs capitalize">
            {row.frequency.replace('_', ' ')}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <div>
          <p>{row.category.nameEn}</p>
          {row.appeal && <p className="text-muted-foreground text-xs">{row.appeal.titleEn}</p>}
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method / Source',
      render: (row) => (
        <div>
          <p className="capitalize">{row.paymentMethod.replace('_', ' ')}</p>
          <p className="text-muted-foreground text-xs capitalize">{row.source}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'date',
      header: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Donations"
        description="All donation records — online, manual, and verified bank transfers."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Donations' }]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/admin/reports" />}>
              <BarChart3 /> Reports
            </Button>
            {canExport && (
              <Button
                variant="outline"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                <Download /> Export CSV
              </Button>
            )}
            {canCreateManual && (
              <Button onClick={openCreate}>
                <Plus /> Record manual donation
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search donor name or email…"
          className="w-72"
        />
        <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No donations found"
        emptyDescription="Try adjusting your filters, or record a manual donation."
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Record manual donation"
        description="For cash, cheque, or in-person contributions. A receipt is generated automatically."
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending}
      >
        <Form {...form}>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="donorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donor name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="donorEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donor email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="donorPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donor phone (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer_manual">Bank transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="netbanking">Net banking</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="internalNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internal note (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </FormDialog>
    </div>
  );
}
