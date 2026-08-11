'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, PlayCircle, X } from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { GalleryItem } from '@/types/public';

function isEmbeddableVideo(url: string): string | null {
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function GalleryGrid({ items, locale }: { items: GalleryItem[]; locale: string }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const active = activeIndex !== null ? items[activeIndex] : null;

  function altText(item: GalleryItem) {
    return (locale === 'te' && item.altTextTe ? item.altTextTe : item.altTextEn) ?? '';
  }

  if (items.length === 0) return null;

  return (
    <>
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="border-pub-neutral-200/70 bg-pub-primary-100 shadow-pub-sm hover:shadow-pub-lg group relative block w-full overflow-hidden rounded-[var(--radius-pub-card)] border transition-all duration-500 hover:-translate-y-1"
          >
            {item.mediaType === 'image' ? (
              <Image
                src={item.mediaUrl}
                alt={altText(item)}
                width={400}
                height={400}
                loading="lazy"
                className="w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="pub-gradient-emerald flex aspect-video w-full items-center justify-center">
                <PlayCircle className="text-pub-gold-300 size-10" />
              </div>
            )}
            <div className="from-pub-primary-950/70 absolute inset-0 flex items-end bg-gradient-to-t via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {altText(item) && (
                <p className="line-clamp-2 text-left text-xs font-medium text-white">
                  {altText(item)}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <DialogContent
          className="max-w-4xl border-none bg-transparent p-0 shadow-none"
          showCloseButton={false}
        >
          {active && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                aria-label="Close"
                className="pub-glass-dark hover:bg-pub-gold-500 hover:text-pub-primary-950 absolute -top-12 right-0 flex size-9 items-center justify-center rounded-full text-white transition-all"
              >
                <X className="size-5" />
              </button>
              {activeIndex !== null && activeIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => (i !== null ? i - 1 : i))}
                  aria-label="Previous"
                  className="pub-glass-dark hover:bg-pub-gold-500 hover:text-pub-primary-950 absolute top-1/2 left-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all"
                >
                  <ChevronLeft className="size-5" />
                </button>
              )}
              {activeIndex !== null && activeIndex < items.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => (i !== null ? i + 1 : i))}
                  aria-label="Next"
                  className="pub-glass-dark hover:bg-pub-gold-500 hover:text-pub-primary-950 absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all"
                >
                  <ChevronRight className="size-5" />
                </button>
              )}
              {active.mediaType === 'image' ? (
                <Image
                  src={active.mediaUrl}
                  alt={altText(active)}
                  width={1200}
                  height={800}
                  className="max-h-[80vh] w-full rounded-lg object-contain"
                />
              ) : isEmbeddableVideo(active.mediaUrl) ? (
                <iframe
                  src={isEmbeddableVideo(active.mediaUrl)!}
                  title={altText(active) || 'Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full rounded-lg"
                />
              ) : (
                <a
                  href={active.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white underline"
                >
                  Open video
                </a>
              )}
              {altText(active) && (
                <p className="mt-2 text-center text-sm text-white/80">{altText(active)}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
