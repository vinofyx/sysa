'use client';

import * as React from 'react';
import { File as FileIcon, Upload, X } from 'lucide-react';

interface FileUploadFieldProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Plain file picker + preview (filename/size) — unlike ImageUploadField this
 * does NOT upload immediately: the Documents module's `POST /documents`
 * endpoint accepts the file and its metadata (category/title/etc.) together
 * in one multipart request, so the File is held in form state until the
 * whole form submits.
 */
export function FileUploadField({
  value,
  onChange,
  accept = 'application/pdf,image/*',
  disabled,
  className,
}: FileUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        disabled={disabled}
      />
      {value ? (
        <div className="border-input flex items-center gap-2 rounded-lg border p-2.5 text-sm">
          <FileIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{value.name}</span>
          <span className="text-muted-foreground shrink-0 text-xs">{formatBytes(value.size)}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Remove file"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="border-input hover:bg-muted/50 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed p-3 text-sm disabled:pointer-events-none disabled:opacity-50"
        >
          <Upload className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-xs">Click to choose a file</span>
        </button>
      )}
    </div>
  );
}
