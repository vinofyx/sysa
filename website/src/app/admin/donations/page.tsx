'use client';

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus,
  Download,
  BarChart3,
  FileDown,
  RefreshCw,
  ExternalLink,
  Wallet,
  CheckCircle2,
  Clock3,
  XCircle,
  Landmark,
  HandCoins,
  Mail,
  MessageCircle,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { SearchInput } from '@/components/shared/search-input';
import { FormDialog } from '@/components/admin/form-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { StatCard } from '@/components/admin/stat-card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { createResourceHooks, apiErrorMessage } from '@/hooks/use-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useHasPermission } from '@/hooks/use-permission';

type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';
type PaymentMethod =
  'upi' | 'card' | 'netbanking' | 'wallet' | 'bank_transfer_manual' | 'cash' | 'cheque';
type SettlementStatus = 'not_settled' | 'pending' | 'settled' | 'failed' | 'unknown';
type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'not_configured';

interface DonationReceipt {
  receiptNumber: string;
  pdfUrl: string | null;
  receiptGeneratedAt: string | null;
  emailStatus: DeliveryStatus | null;
  emailSentAt: string | null;
  emailFailureReason: string | null;
  whatsappStatus: DeliveryStatus | null;
  whatsappSentAt: string | null;
  whatsappFailureReason: string | null;
}

interface Donation {
  id: string;
  amount: string;
  currency: string;
  status: DonationStatus;
  source: 'online' | 'manual';
  frequency: 'one_time' | 'monthly';
  paymentMethod: PaymentMethod | null;
  razorpayOrderId: string | null;
  paymentGatewayRef: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  donor: {
    name: string;
    email: string;
    phone: string;
    panNumberMasked: string | null;
    aadhaarNumberMasked: string | null;
  };
  category: { nameEn: string };
  appeal: { titleEn: string } | null;
  receipt: DonationReceipt | null;
  // Payment/settlement tracking — all null until a payment has been captured
  // and/or synced at least once (never fabricated, see razorpay-settlement.service.ts).
  razorpayPaymentStatus: string | null;
  razorpayFee: string | null;
  razorpayTax: string | null;
  netAmount: string | null;
  settlementStatus: SettlementStatus | null;
  razorpaySettlementId: string | null;
  razorpaySettlementUtr: string | null;
  settledAt: string | null;
  refundAmount: string | null;
  paymentSyncedAt: string | null;
}

interface DonationCategory {
  id: string;
  nameEn: string;
}

interface PaymentSummary {
  totalDonations: number;
  successfulPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedAmount: number;
  totalSettledAmount: number;
  pendingSettlementAmount: number;
}

/** `razorpayPaymentStatus` (created/authorized/captured/failed/refunded) is
 * the more precise, Razorpay-native status once a payment has actually been
 * synced at least once; before that, this app's own `status` lifecycle
 * (pending/completed/failed/refunded) is the only thing known. Never shows
 * both — one clear label per row. */
function deliveryLabel(status: DeliveryStatus | null | undefined): string {
  if (!status) return 'not sent';
  if (status === 'pending') return 'queued';
  if (status === 'not_configured') return 'failed';
  return status;
}

function paymentStatusLabel(row: Donation): string {
  if (row.refundAmount && Number(row.refundAmount) > 0) {
    return Number(row.refundAmount) < Number(row.amount) ? 'Partially Refunded' : 'Refunded';
  }
  return row.razorpayPaymentStatus ?? row.status;
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
  const [source, setSource] = React.useState<string>('all');
  const [settlementStatus, setSettlementStatus] = React.useState<string>('all');
  const [paymentMethod, setPaymentMethod] = React.useState<string>('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailsDonation, setDetailsDonation] = React.useState<Donation | null>(null);

  const canCreateManual = useHasPermission('donations:create_manual');
  const canExport = useHasPermission('donations:export');
  const debouncedSearch = useDebouncedValue(search, 400);
  const queryClient = useQueryClient();

  const query = {
    page,
    pageSize: 15,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(source !== 'all' ? { source } : {}),
    ...(settlementStatus !== 'all' ? { settlementStatus } : {}),
    ...(paymentMethod !== 'all' ? { paymentMethod } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
  const { data, isLoading } = resource.useList(query);
  const { data: categoryData } = categoryResource.useList({ page: 1, pageSize: 100 });
  const categories = React.useMemo(() => categoryData?.data ?? [], [categoryData]);

  // dashboard_summary — every figure is a real DB aggregate (see
  // donation.repository.ts::getPaymentSummary), never hardcoded.
  const { data: summary, isLoading: summaryLoading } = useQuery<PaymentSummary>({
    queryKey: ['donations', 'payment-summary'],
    queryFn: async () => {
      const { data: response } = await apiClient.get<{ data: PaymentSummary }>(
        '/donations/payment-summary',
      );
      return response.data;
    },
  });

  const refreshStatusMutation = useMutation<Donation, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      const { data: response } = await apiClient.post<{ data: Donation }>(
        `/donations/${id}/refresh-payment-status`,
      );
      return response.data;
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: resource.keys.all });
      void queryClient.invalidateQueries({ queryKey: ['donations', 'payment-summary'] });
      setDetailsDonation((prev) => (prev && prev.id === updated.id ? updated : prev));
      toast.success('Payment status refreshed from Razorpay');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not refresh payment status')),
  });

  function applyUpdatedDonation(updated: Donation) {
    void queryClient.invalidateQueries({ queryKey: resource.keys.all });
    setDetailsDonation((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  const retryEmailMutation = useMutation<Donation, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      await apiClient.post(`/donations/${id}/retry-email`);
      const { data: response } = await apiClient.get<{ data: Donation }>(`/donations/${id}`);
      return response.data;
    },
    onSuccess: (updated) => {
      applyUpdatedDonation(updated);
      toast.success(
        updated.receipt?.emailStatus === 'sent'
          ? 'Email sent successfully'
          : 'Email delivery failed — see the failure reason',
      );
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not resend email')),
  });

  const retryWhatsAppMutation = useMutation<Donation, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      await apiClient.post(`/donations/${id}/retry-whatsapp`);
      const { data: response } = await apiClient.get<{ data: Donation }>(`/donations/${id}`);
      return response.data;
    },
    onSuccess: (updated) => {
      applyUpdatedDonation(updated);
      toast.success(
        updated.receipt?.whatsappStatus === 'sent'
          ? 'WhatsApp sent successfully'
          : 'WhatsApp delivery failed — see the failure reason',
      );
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not resend WhatsApp')),
  });

  const retryDeliveriesMutation = useMutation<Donation, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      await apiClient.post(`/donations/${id}/retry-deliveries`);
      const { data: response } = await apiClient.get<{ data: Donation }>(`/donations/${id}`);
      return response.data;
    },
    onSuccess: (updated) => {
      applyUpdatedDonation(updated);
      toast.success('Retry finished for channels that were not already sent');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not retry deliveries')),
  });

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
        params: {
          ...(status !== 'all' ? { status } : {}),
          ...(source !== 'all' ? { source } : {}),
        },
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
          <p className="capitalize">
            {row.paymentMethod ? row.paymentMethod.replace('_', ' ') : 'Awaiting payment'}
          </p>
          <p className="text-muted-foreground text-xs capitalize">{row.source}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Payment Status',
      render: (row) => <StatusBadge status={paymentStatusLabel(row)} />,
    },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (row) => (
        <StatusBadge
          status={
            row.receipt?.pdfUrl || row.receipt?.receiptGeneratedAt || row.receipt?.receiptNumber
              ? 'generated'
              : row.receipt
                ? 'queued'
                : 'not generated'
          }
        />
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <StatusBadge status={deliveryLabel(row.receipt?.emailStatus)} />,
    },
    {
      key: 'whatsapp',
      header: 'WhatsApp',
      render: (row) => <StatusBadge status={deliveryLabel(row.receipt?.whatsappStatus)} />,
    },
    {
      key: 'settlement',
      header: 'Settlement',
      render: (row) =>
        row.source === 'online' ? (
          <div>
            <StatusBadge status={row.settlementStatus ?? 'unknown'} />
            {row.settledAt && (
              <p className="text-muted-foreground mt-1 text-xs">
                {new Date(row.settledAt).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">— manual —</span>
        ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.source === 'online' && row.paymentGatewayRef && (
            <Button
              variant="ghost"
              size="icon"
              title="Refresh payment status"
              onClick={(event) => {
                event.stopPropagation();
                refreshStatusMutation.mutate(row.id);
              }}
              disabled={refreshStatusMutation.isPending}
            >
              <RefreshCw className={refreshStatusMutation.isPending ? 'animate-spin' : undefined} />
            </Button>
          )}
        </div>
      ),
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Donations"
          value={summary?.totalDonations}
          icon={HandCoins}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Successful Payments"
          value={summary?.successfulPayments}
          icon={CheckCircle2}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Pending Payments"
          value={summary?.pendingPayments}
          icon={Clock3}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Failed Payments"
          value={summary?.failedPayments}
          icon={XCircle}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Refunded Amount"
          value={summary ? currency(summary.refundedAmount) : undefined}
          icon={Wallet}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Total Settled Amount"
          value={summary ? currency(summary.totalSettledAmount) : undefined}
          icon={Landmark}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Pending Settlement"
          value={summary ? currency(summary.pendingSettlementAmount) : undefined}
          icon={Clock3}
          isLoading={summaryLoading}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search donor, email, Razorpay payment/order ID…"
          className="w-80"
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
        <Select value={source} onValueChange={(value) => setSource(value ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="online">Online (Razorpay)</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={settlementStatus}
          onValueChange={(value) => setSettlementStatus(value ?? 'all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All settlement statuses</SelectItem>
            <SelectItem value="not_settled">Not Settled</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="netbanking">Net banking</SelectItem>
            <SelectItem value="wallet">Wallet</SelectItem>
            <SelectItem value="bank_transfer_manual">Bank transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="w-40"
          aria-label="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="w-40"
          aria-label="To date"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        onRowClick={(row) => setDetailsDonation(row)}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <Dialog open={!!detailsDonation} onOpenChange={(open) => !open && setDetailsDonation(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {detailsDonation && (
            <>
              <DialogHeader>
                <DialogTitle>Payment details</DialogTitle>
                <DialogDescription>
                  {detailsDonation.donor.name} · {currency(detailsDonation.amount)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Donation
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Donation ID</dt>
                  <dd className="font-mono text-xs break-all">{detailsDonation.id}</dd>
                  <dt className="text-muted-foreground">Donor</dt>
                  <dd>{detailsDonation.donor.name}</dd>
                  <dt className="text-muted-foreground">Mobile</dt>
                  <dd>{detailsDonation.donor.phone || '—'}</dd>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{detailsDonation.donor.email || '—'}</dd>
                  {detailsDonation.donor.panNumberMasked && (
                    <>
                      <dt className="text-muted-foreground">PAN</dt>
                      <dd className="font-mono text-xs">{detailsDonation.donor.panNumberMasked}</dd>
                    </>
                  )}
                  {detailsDonation.donor.aadhaarNumberMasked && (
                    <>
                      <dt className="text-muted-foreground">Aadhaar</dt>
                      <dd className="font-mono text-xs">
                        {detailsDonation.donor.aadhaarNumberMasked}
                      </dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{detailsDonation.category.nameEn}</dd>
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-medium">{currency(detailsDonation.amount)}</dd>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="capitalize">{detailsDonation.source}</dd>
                </dl>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Payment
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Payment status</dt>
                  <dd>
                    <StatusBadge status={paymentStatusLabel(detailsDonation)} />
                  </dd>
                  <dt className="text-muted-foreground">Payment method</dt>
                  <dd className="capitalize">
                    {detailsDonation.paymentMethod
                      ? detailsDonation.paymentMethod.replace('_', ' ')
                      : 'Awaiting payment'}
                  </dd>
                  <dt className="text-muted-foreground">Razorpay order ID</dt>
                  <dd className="font-mono text-xs break-all">
                    {detailsDonation.razorpayOrderId ?? '—'}
                  </dd>
                  <dt className="text-muted-foreground">Razorpay payment ID</dt>
                  <dd className="font-mono text-xs break-all">
                    {detailsDonation.paymentGatewayRef ?? '—'}
                  </dd>
                  {detailsDonation.failureReason && (
                    <>
                      <dt className="text-muted-foreground">Failure reason</dt>
                      <dd className="text-destructive">{detailsDonation.failureReason}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(detailsDonation.createdAt).toLocaleString('en-IN')}</dd>
                  {detailsDonation.completedAt && (
                    <>
                      <dt className="text-muted-foreground">Payment date</dt>
                      <dd>{new Date(detailsDonation.completedAt).toLocaleString('en-IN')}</dd>
                    </>
                  )}
                  {detailsDonation.razorpayFee != null && (
                    <>
                      <dt className="text-muted-foreground">Razorpay fee</dt>
                      <dd>{currency(detailsDonation.razorpayFee)}</dd>
                    </>
                  )}
                  {detailsDonation.razorpayTax != null && (
                    <>
                      <dt className="text-muted-foreground">Tax on fee</dt>
                      <dd>{currency(detailsDonation.razorpayTax)}</dd>
                    </>
                  )}
                  {detailsDonation.netAmount != null && (
                    <>
                      <dt className="text-muted-foreground">Net amount</dt>
                      <dd className="font-medium">{currency(detailsDonation.netAmount)}</dd>
                    </>
                  )}
                  {detailsDonation.refundAmount != null &&
                    Number(detailsDonation.refundAmount) > 0 && (
                      <>
                        <dt className="text-muted-foreground">Refunded</dt>
                        <dd className="text-destructive">
                          {currency(detailsDonation.refundAmount)}
                        </dd>
                      </>
                    )}
                </dl>
              </div>

              {detailsDonation.source === 'online' && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Settlement — has this reached the bank account?
                  </p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Settlement status</dt>
                    <dd>
                      <StatusBadge status={detailsDonation.settlementStatus ?? 'unknown'} />
                    </dd>
                    {detailsDonation.razorpaySettlementId && (
                      <>
                        <dt className="text-muted-foreground">Settlement ID</dt>
                        <dd className="font-mono text-xs break-all">
                          {detailsDonation.razorpaySettlementId}
                        </dd>
                      </>
                    )}
                    {detailsDonation.razorpaySettlementUtr && (
                      <>
                        <dt className="text-muted-foreground">Bank UTR</dt>
                        <dd className="font-mono text-xs break-all">
                          {detailsDonation.razorpaySettlementUtr}
                        </dd>
                      </>
                    )}
                    {detailsDonation.settledAt && (
                      <>
                        <dt className="text-muted-foreground">Settlement date</dt>
                        <dd>{new Date(detailsDonation.settledAt).toLocaleString('en-IN')}</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">Last checked</dt>
                    <dd>
                      {detailsDonation.paymentSyncedAt
                        ? new Date(detailsDonation.paymentSyncedAt).toLocaleString('en-IN')
                        : 'Never — click Refresh below'}
                    </dd>
                  </dl>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Receipt
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Donation ID</dt>
                  <dd className="font-mono text-xs break-all">{detailsDonation.id}</dd>
                  <dt className="text-muted-foreground">Razorpay Payment ID</dt>
                  <dd className="font-mono text-xs break-all">
                    {detailsDonation.paymentGatewayRef ?? '—'}
                  </dd>
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd>{currency(detailsDonation.amount)}</dd>
                  <dt className="text-muted-foreground">Payment Status</dt>
                  <dd>
                    <StatusBadge status={paymentStatusLabel(detailsDonation)} />
                  </dd>
                  <dt className="text-muted-foreground">Receipt Generated</dt>
                  <dd>
                    {detailsDonation.receipt?.pdfUrl ||
                    detailsDonation.receipt?.receiptGeneratedAt ||
                    detailsDonation.receipt?.receiptNumber ? (
                      <StatusBadge status="generated" />
                    ) : detailsDonation.receipt ? (
                      <StatusBadge status="queued" />
                    ) : (
                      <StatusBadge status="not generated" />
                    )}
                  </dd>
                  {detailsDonation.receipt?.receiptNumber && (
                    <>
                      <dt className="text-muted-foreground">Receipt number</dt>
                      <dd>{detailsDonation.receipt.receiptNumber}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Email Status</dt>
                  <dd>
                    <StatusBadge status={deliveryLabel(detailsDonation.receipt?.emailStatus)} />
                  </dd>
                  <dt className="text-muted-foreground">Email Sent At</dt>
                  <dd>
                    {detailsDonation.receipt?.emailSentAt
                      ? new Date(detailsDonation.receipt.emailSentAt).toLocaleString('en-IN')
                      : '—'}
                  </dd>
                  {detailsDonation.receipt?.emailFailureReason && (
                    <>
                      <dt className="text-muted-foreground">Email Failure Reason</dt>
                      <dd className="text-destructive">
                        {detailsDonation.receipt.emailFailureReason}
                      </dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">WhatsApp Status</dt>
                  <dd>
                    <StatusBadge status={deliveryLabel(detailsDonation.receipt?.whatsappStatus)} />
                  </dd>
                  <dt className="text-muted-foreground">WhatsApp Sent At</dt>
                  <dd>
                    {detailsDonation.receipt?.whatsappSentAt
                      ? new Date(detailsDonation.receipt.whatsappSentAt).toLocaleString('en-IN')
                      : '—'}
                  </dd>
                  {detailsDonation.receipt?.whatsappFailureReason && (
                    <>
                      <dt className="text-muted-foreground">WhatsApp Failure Reason</dt>
                      <dd className="text-destructive">
                        {detailsDonation.receipt.whatsappFailureReason}
                      </dd>
                    </>
                  )}
                </dl>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {detailsDonation.receipt?.pdfUrl && (
                  <Button
                    variant="outline"
                    render={
                      <a href={detailsDonation.receipt.pdfUrl} target="_blank" rel="noreferrer" />
                    }
                  >
                    <FileDown /> Download receipt
                  </Button>
                )}
                {detailsDonation.paymentGatewayRef && (
                  <Button
                    variant="outline"
                    render={
                      <a
                        href={`https://dashboard.razorpay.com/app/payments/${detailsDonation.paymentGatewayRef}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <ExternalLink /> View on Razorpay
                  </Button>
                )}
                {detailsDonation.receipt && detailsDonation.receipt.emailStatus !== 'sent' && (
                  <Button
                    variant="outline"
                    onClick={() => retryEmailMutation.mutate(detailsDonation.id)}
                    disabled={retryEmailMutation.isPending}
                  >
                    <Mail className={retryEmailMutation.isPending ? 'animate-spin' : undefined} />
                    Resend Email
                  </Button>
                )}
                {detailsDonation.receipt && detailsDonation.receipt.whatsappStatus !== 'sent' && (
                  <Button
                    variant="outline"
                    onClick={() => retryWhatsAppMutation.mutate(detailsDonation.id)}
                    disabled={retryWhatsAppMutation.isPending}
                  >
                    <MessageCircle
                      className={retryWhatsAppMutation.isPending ? 'animate-spin' : undefined}
                    />
                    Resend WhatsApp
                  </Button>
                )}
                {detailsDonation.receipt &&
                  (detailsDonation.receipt.emailStatus !== 'sent' ||
                    detailsDonation.receipt.whatsappStatus !== 'sent') && (
                    <Button
                      variant="outline"
                      onClick={() => retryDeliveriesMutation.mutate(detailsDonation.id)}
                      disabled={retryDeliveriesMutation.isPending}
                    >
                      <RefreshCw
                        className={retryDeliveriesMutation.isPending ? 'animate-spin' : undefined}
                      />
                      Retry Failed Deliveries
                    </Button>
                  )}
                {detailsDonation.source === 'online' && detailsDonation.paymentGatewayRef && (
                  <Button
                    variant="outline"
                    onClick={() => refreshStatusMutation.mutate(detailsDonation.id)}
                    disabled={refreshStatusMutation.isPending}
                  >
                    <RefreshCw
                      className={refreshStatusMutation.isPending ? 'animate-spin' : undefined}
                    />
                    Refresh Payment Status
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
