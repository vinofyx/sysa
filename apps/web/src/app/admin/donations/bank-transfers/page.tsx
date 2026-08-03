'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import type { AxiosError } from 'axios';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { apiErrorMessage } from '@/hooks/use-resource';
import { useHasPermission } from '@/hooks/use-permission';
import type { PaginatedResult } from '@/types/auth';

type BankTransferStatus = 'pending_verification' | 'verified' | 'rejected';

interface BankTransferRecord {
  id: string;
  donorName: string;
  donorEmail: string | null;
  donorPhone: string | null;
  amount: string;
  bankReferenceUtr: string | null;
  submittedAt: string;
  status: BankTransferStatus;
  category: { nameEn: string };
}

function currency(value: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const keys = {
  list: (params: Record<string, unknown>) => ['bank-transfers', 'list', params] as const,
};

function useBankTransfers(params: Record<string, unknown>) {
  return useQuery<PaginatedResult<BankTransferRecord>>({
    queryKey: keys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<BankTransferRecord>>('/bank-transfers', {
        params,
      });
      return data;
    },
  });
}

export default function BankTransfersPage() {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('pending_verification');
  const [verifying, setVerifying] = React.useState<BankTransferRecord | null>(null);
  const [rejecting, setRejecting] = React.useState<BankTransferRecord | null>(null);
  const [rejectNote, setRejectNote] = React.useState('');

  const canManage = useHasPermission('bank_transfers:manage');
  const queryClient = useQueryClient();
  const params = { page, pageSize: 15, ...(status !== 'all' ? { status } : {}) };
  const { data, isLoading } = useBankTransfers(params);

  const verifyMutation = useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      await apiClient.post(`/bank-transfers/${id}/verify`, {
        paymentMethod: 'bank_transfer_manual',
      });
    },
    onSuccess: () => {
      toast.success('Transfer verified — donation and receipt created');
      setVerifying(null);
      void queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const rejectMutation = useMutation<
    void,
    AxiosError<ApiErrorBody>,
    { id: string; internalNote: string }
  >({
    mutationFn: async ({ id, internalNote }) => {
      await apiClient.post(`/bank-transfers/${id}/reject`, { internalNote });
    },
    onSuccess: () => {
      toast.success('Transfer claim rejected');
      setRejecting(null);
      setRejectNote('');
      void queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const columns: DataTableColumn<BankTransferRecord>[] = [
    {
      key: 'donor',
      header: 'Donor',
      render: (row) => (
        <div>
          <p className="font-medium">{row.donorName}</p>
          {row.donorEmail && <p className="text-muted-foreground text-xs">{row.donorEmail}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <div>
          <p className="font-medium">{currency(row.amount)}</p>
          <p className="text-muted-foreground text-xs">{row.category.nameEn}</p>
        </div>
      ),
    },
    {
      key: 'utr',
      header: 'Bank ref / UTR',
      render: (row) => row.bankReferenceUtr || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (row) => new Date(row.submittedAt).toLocaleDateString('en-IN'),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Bank Transfer Claims"
        description="Donor-submitted &ldquo;I've made a transfer&rdquo; claims awaiting verification."
        breadcrumb={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Donations', href: '/admin/donations' },
          { label: 'Bank Transfers' },
        ]}
      />

      <div className="mb-4">
        <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_verification">Pending verification</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No claims found"
        rowActions={
          canManage
            ? (row) =>
                row.status === 'pending_verification' ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setVerifying(row)}
                      aria-label="Verify"
                    >
                      <Check className="text-green-600 dark:text-green-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRejecting(row)}
                      aria-label="Reject"
                    >
                      <X className="text-destructive" />
                    </Button>
                  </>
                ) : null
            : undefined
        }
      />
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <ConfirmDialog
        open={!!verifying}
        onOpenChange={(open) => !open && setVerifying(null)}
        title="Verify this bank transfer?"
        description={`This creates a completed donation and receipt for ${verifying?.donorName} (${verifying ? currency(verifying.amount) : ''}).`}
        confirmLabel="Verify"
        variant="default"
        isPending={verifyMutation.isPending}
        onConfirm={() => verifying && verifyMutation.mutate(verifying.id)}
      />

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this claim?</DialogTitle>
            <DialogDescription>
              Explain why (e.g. no matching transfer found) — this note is kept internally.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
            rows={3}
            placeholder="Reason for rejection…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectNote.trim() || rejectMutation.isPending}
              onClick={() =>
                rejecting && rejectMutation.mutate({ id: rejecting.id, internalNote: rejectNote })
              }
            >
              Reject claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
