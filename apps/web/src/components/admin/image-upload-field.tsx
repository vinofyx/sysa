'use client';

import * as React from 'react';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import { apiErrorMessage } from '@/hooks/use-resource';
import { Button } from '@/components/ui/button';
import type { AxiosError } from 'axios';

interface ImageUploadFieldProps {
  value: string | undefined;
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Drag-and-drop / click-to-browse image upload with preview — uploads via
 * the generic `POST /media/upload` endpoint (apps/api/src/routes/v1/media.routes.ts)
 * and writes the returned Cloudinary URL into the field, matching how every
 * simple-CRUD CMS module (Hero Banners, Testimonials, Committee) stores images
 * as a plain URL string.
 */
export function ImageUploadField({ value, onChange, disabled, className }: ImageUploadFieldProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = useMutation<string, AxiosError<ApiErrorBody>, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<{ url: string }>('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url;
    },
    onSuccess: (url) => onChange(url),
    onError: (error) => toast.error(apiErrorMessage(error, 'Image upload failed')),
  });

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) upload.mutate(file);
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={disabled || upload.isPending}
      />
      {value ? (
        <div className="group relative w-fit">
          <Image
            src={value}
            alt="Uploaded preview"
            width={160}
            height={160}
            className="size-40 rounded-lg border object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="absolute top-1.5 right-1.5"
              onClick={() => onChange('')}
              aria-label="Remove image"
            >
              <X />
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || upload.isPending}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={`border-input flex size-40 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 ${
            isDragOver ? 'border-ring bg-muted' : 'hover:bg-muted/50'
          }`}
        >
          {upload.isPending ? (
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          ) : (
            <>
              <ImagePlus className="text-muted-foreground size-5" />
              <span className="text-muted-foreground px-2 text-center text-xs">
                Click or drag an image here
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
