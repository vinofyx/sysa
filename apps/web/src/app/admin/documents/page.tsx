'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import type { AxiosError } from 'axios';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type DataTableColumn } from '@/components/admin/data-table';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { FormDialog } from '@/components/admin/form-dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { FileUploadField } from '@/components/admin/file-upload-field';
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
import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { createResourceHooks, apiErrorMessage } from '@/hooks/use-resource';
import { useHasPermission } from '@/hooks/use-permission';

type DocumentCategory =
  | 'registration_certificate'
  | 'certificate_12ab'
  | 'certificate_80g'
  | 'pan_card'
  | 'annual_report'
  | 'audit_report'
  | 'financial_statement';

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  registration_certificate: 'Registration Certificate',
  certificate_12ab: '12A/12AB Certificate',
  certificate_80g: '80G Certificate',
  pan_card: 'PAN Card',
  annual_report: 'Annual Report',
  audit_report: 'Audit Report',
  financial_statement: 'Financial Statement',
};

interface DocumentRow {
  id: string;
  category: DocumentCategory;
  titleEn: string;
  fileUrl: string;
  publishedDate: string | null;
  publicVisible: boolean;
}

const uploadSchema = z.object({
  category: z.enum([
    'registration_certificate',
    'certificate_12ab',
    'certificate_80g',
    'pan_card',
    'annual_report',
    'audit_report',
    'financial_statement',
  ]),
  titleEn: z.string().min(1, 'Required').max(200),
  publishedDate: z.string().optional().or(z.literal('')),
  publicVisible: z.boolean(),
});

const editSchema = uploadSchema.omit({ category: true });

type UploadFormValues = z.infer<typeof uploadSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const EMPTY_UPLOAD: UploadFormValues = {
  category: 'annual_report',
  titleEn: '',
  publishedDate: '',
  publicVisible: false,
};

const resource = createResourceHooks<DocumentRow>({
  resourceKey: 'documents',
  basePath: '/documents',
});

export default function DocumentsPage() {
  const [page, setPage] = React.useState(1);
  const [category, setCategory] = React.useState('all');
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [editing, setEditing] = React.useState<DocumentRow | null>(null);
  const [deleting, setDeleting] = React.useState<DocumentRow | null>(null);

  const canUpload = useHasPermission('documents:upload');
  const canPublish = useHasPermission('documents:publish');
  const queryClient = useQueryClient();

  const { data, isLoading } = resource.useList({
    page,
    pageSize: 15,
    ...(category !== 'all' ? { category } : {}),
  });
  const updateMutation = resource.useUpdate();
  const deleteMutation = resource.useDelete();

  const uploadMutation = useMutation<
    void,
    AxiosError<ApiErrorBody>,
    UploadFormValues & { file: File }
  >({
    mutationFn: async (values) => {
      const formData = new FormData();
      formData.append('file', values.file);
      formData.append('category', values.category);
      formData.append('titleEn', values.titleEn);
      if (values.publishedDate) formData.append('publishedDate', values.publishedDate);
      formData.append('publicVisible', String(values.publicVisible));
      await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      setUploadOpen(false);
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: resource.keys.all });
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Upload failed')),
  });

  const uploadForm = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: EMPTY_UPLOAD,
  });
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { titleEn: '', publishedDate: '', publicVisible: false },
  });

  function openUpload() {
    uploadForm.reset(EMPTY_UPLOAD);
    setFile(null);
    setUploadOpen(true);
  }

  function openEdit(row: DocumentRow) {
    setEditing(row);
    editForm.reset({
      titleEn: row.titleEn,
      publishedDate: row.publishedDate ? row.publishedDate.slice(0, 10) : '',
      publicVisible: row.publicVisible,
    });
  }

  function onUpload(values: UploadFormValues) {
    if (!file) {
      toast.error('Choose a file to upload');
      return;
    }
    uploadMutation.mutate({ ...values, file });
  }

  function onEdit(values: EditFormValues) {
    if (!editing) return;
    const payload = { ...values, publishedDate: values.publishedDate || undefined };
    updateMutation
      .mutateAsync({ id: editing.id, input: payload })
      .then(() => {
        toast.success('Document updated');
        setEditing(null);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Document removed');
        setDeleting(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<DocumentRow>[] = [
    {
      key: 'title',
      header: 'Document',
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <div>
            <a
              href={row.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline"
            >
              {row.titleEn}
            </a>
            <p className="text-muted-foreground text-xs">{CATEGORY_LABELS[row.category]}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'published',
      header: 'Published',
      render: (row) =>
        row.publishedDate ? (
          new Date(row.publishedDate).toLocaleDateString('en-IN')
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'visible',
      header: 'Public',
      render: (row) => (
        <span
          className={
            row.publicVisible ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
          }
        >
          {row.publicVisible ? 'Visible' : 'Hidden'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Compliance documents (12A, 80G, PAN, registration, reports) and the public Download Centre."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Documents' }]}
        action={
          canUpload && (
            <Button onClick={openUpload}>
              <Plus /> Upload document
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Select value={category} onValueChange={(value) => setCategory(value ?? 'all')}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No documents yet"
        rowActions={
          canPublish
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
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="Upload document"
        onSubmit={uploadForm.handleSubmit(onUpload)}
        isPending={uploadMutation.isPending}
      >
        <Form {...uploadForm}>
          <div>
            <FormLabel className="mb-2 block">File</FormLabel>
            <FileUploadField value={file} onChange={setFile} accept="application/pdf,image/*" />
          </div>
          <FormField
            control={uploadForm.control}
            name="category"
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
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={uploadForm.control}
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
          <div className="flex items-center gap-4">
            <FormField
              control={uploadForm.control}
              name="publishedDate"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Published date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={uploadForm.control}
              name="publicVisible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 pt-6">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Show in Download Centre</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </Form>
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit document"
        onSubmit={editForm.handleSubmit(onEdit)}
        isPending={updateMutation.isPending}
      >
        <Form {...editForm}>
          <FormField
            control={editForm.control}
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
          <div className="flex items-center gap-4">
            <FormField
              control={editForm.control}
              name="publishedDate"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Published date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="publicVisible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 pt-6">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Show in Download Centre</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </Form>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this document?"
        description={`"${deleting?.titleEn}" will be permanently deleted.`}
        confirmLabel="Remove"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
