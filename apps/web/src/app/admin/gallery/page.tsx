'use client';

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Images } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { EmptyState } from '@/components/admin/empty-state';
import { FormDialog } from '@/components/admin/form-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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

interface GalleryAlbum {
  id: string;
  nameEn: string;
  category: string | null;
  _count: { items: number };
}

const albumSchema = z.object({
  nameEn: z.string().min(1, 'Required').max(150),
  category: z.string().max(100).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int(),
});

type AlbumFormValues = z.infer<typeof albumSchema>;

const EMPTY_VALUES: AlbumFormValues = { nameEn: '', category: '', displayOrder: 0 };

const resource = createResourceHooks<GalleryAlbum>({
  resourceKey: 'gallery-albums',
  basePath: '/gallery/albums',
});

export default function GalleryAlbumsPage() {
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const canManage = useHasPermission('gallery:manage');
  const { data, isLoading } = resource.useList({ page, pageSize: 12 });
  const createMutation = resource.useCreate();

  const form = useForm<AlbumFormValues>({
    resolver: zodResolver(albumSchema),
    defaultValues: EMPTY_VALUES,
  });

  function openCreate() {
    form.reset(EMPTY_VALUES);
    setDialogOpen(true);
  }

  function onSubmit(values: AlbumFormValues) {
    const payload = { ...values, category: values.category || undefined };
    createMutation
      .mutateAsync(payload)
      .then(() => {
        toast.success('Album created');
        setDialogOpen(false);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  const albums = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Gallery"
        description="Photo and video albums."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Gallery' }]}
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus /> Create album
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No albums yet"
          description="Create an album to start uploading photos and videos."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((album) => (
            <Link key={album.id} href={`/admin/gallery/${album.id}`}>
              <Card className="hover:ring-primary/40 overflow-hidden py-0 transition-shadow">
                <div className="bg-muted flex aspect-square items-center justify-center">
                  <Images className="text-muted-foreground size-8" />
                </div>
                <CardContent className="p-3">
                  <p className="truncate font-medium">{album.nameEn}</p>
                  <p className="text-muted-foreground text-xs">{album._count.items} items</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <PaginationBar pagination={data?.pagination} onPageChange={setPage} />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create album"
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={createMutation.isPending}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Album name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Annual Day 2026" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="displayOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display order</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
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
