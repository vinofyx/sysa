'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Upload, Video } from 'lucide-react';
import type { AxiosError } from 'axios';

import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { apiErrorMessage } from '@/hooks/use-resource';
import { useHasPermission } from '@/hooks/use-permission';

interface GalleryItem {
  id: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  altTextEn: string | null;
  displayOrder: number;
}

interface GalleryAlbumDetail {
  id: string;
  nameEn: string;
  category: string | null;
  items: GalleryItem[];
}

function useAlbum(albumId: string) {
  return useQuery<GalleryAlbumDetail>({
    queryKey: ['gallery-albums', 'detail', albumId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: GalleryAlbumDetail }>(
        `/gallery/albums/${albumId}`,
      );
      return data.data;
    },
  });
}

export default function GalleryAlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useHasPermission('gallery:manage');

  const { data: album, isLoading } = useAlbum(albumId);
  const [videoDialogOpen, setVideoDialogOpen] = React.useState(false);
  const [videoUrl, setVideoUrl] = React.useState('');
  const [deletingItem, setDeletingItem] = React.useState<GalleryItem | null>(null);
  const [deletingAlbum, setDeletingAlbum] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['gallery-albums'] });
  }

  const uploadMutation = useMutation<void, AxiosError<ApiErrorBody>, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post(`/gallery/albums/${albumId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Photo uploaded');
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Upload failed')),
  });

  const addVideoMutation = useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (url) => {
      await apiClient.post(`/gallery/albums/${albumId}/videos`, { videoUrl: url });
    },
    onSuccess: () => {
      toast.success('Video added');
      setVideoDialogOpen(false);
      setVideoUrl('');
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not add video')),
  });

  const deleteItemMutation = useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (itemId) => {
      await apiClient.delete(`/gallery/items/${itemId}`);
    },
    onSuccess: () => {
      toast.success('Item removed');
      setDeletingItem(null);
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const reorderMutation = useMutation<
    void,
    AxiosError<ApiErrorBody>,
    { id: string; displayOrder: number }[]
  >({
    mutationFn: async (items) => {
      await apiClient.patch('/gallery/items/reorder', { items });
    },
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteAlbumMutation = useMutation<void, AxiosError<ApiErrorBody>, void>({
    mutationFn: async () => {
      await apiClient.delete(`/gallery/albums/${albumId}`);
    },
    onSuccess: () => {
      toast.success('Album deleted');
      router.push('/admin/gallery');
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function moveItem(index: number, direction: -1 | 1) {
    if (!album) return;
    const items = [...album.items];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    reorderMutation.mutate(items.map((item, i) => ({ id: item.id, displayOrder: i })));
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!album) return null;

  return (
    <div>
      <PageHeader
        title={album.nameEn}
        description={album.category ?? undefined}
        breadcrumb={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Gallery', href: '/admin/gallery' },
          { label: album.nameEn },
        ]}
        action={
          canManage && (
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                  event.target.value = '';
                }}
              />
              <Button variant="outline" onClick={() => setVideoDialogOpen(true)}>
                <Video /> Add video
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <Upload />}{' '}
                Upload photo
              </Button>
              <Button variant="destructive" onClick={() => setDeletingAlbum(true)}>
                <Trash2 /> Delete album
              </Button>
            </div>
          )
        }
      />

      {album.items.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No items yet"
          description="Upload photos or add a video to this album."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {album.items.map((item, index) => (
            <Card key={item.id} className="group relative overflow-hidden py-0">
              <div className="bg-muted aspect-square">
                {item.mediaType === 'image' ? (
                  <Image
                    src={item.mediaUrl}
                    alt={item.altTextEn ?? album.nameEn}
                    width={300}
                    height={300}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Video className="text-muted-foreground size-8" />
                  </div>
                )}
              </div>
              {canManage && (
                <CardContent className="flex items-center justify-between p-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                      aria-label="Move earlier"
                    >
                      <ArrowLeft />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === album.items.length - 1}
                      onClick={() => moveItem(index, 1)}
                      aria-label="Move later"
                    >
                      <ArrowRight />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setDeletingItem(item)}
                    aria-label="Delete item"
                  >
                    <Trash2 />
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a video</DialogTitle>
            <DialogDescription>
              Paste a YouTube, Vimeo, or other external video URL.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://youtube.com/watch?v=…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!videoUrl.trim() || addVideoMutation.isPending}
              onClick={() => addVideoMutation.mutate(videoUrl)}
            >
              <Plus /> Add video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Remove this item?"
        description="This will permanently remove it from the album."
        confirmLabel="Remove"
        isPending={deleteItemMutation.isPending}
        onConfirm={() => deletingItem && deleteItemMutation.mutate(deletingItem.id)}
      />

      <ConfirmDialog
        open={deletingAlbum}
        onOpenChange={setDeletingAlbum}
        title="Delete this album?"
        description={`"${album.nameEn}" and all ${album.items.length} items in it will be permanently deleted.`}
        confirmLabel="Delete album"
        isPending={deleteAlbumMutation.isPending}
        onConfirm={() => deleteAlbumMutation.mutate()}
      />
    </div>
  );
}
