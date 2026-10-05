'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PaginatedResult } from '@/types/pagination';

interface PaginationBarProps {
  pagination: PaginatedResult<unknown>['pagination'] | undefined;
  onPageChange: (page: number) => void;
  /** Omitted by every admin call site (English-only CMS) — defaults below
   * match the previous hardcoded copy exactly. The public site's
   * `news-browser.tsx` is the only caller that passes translated labels. */
  labels?: {
    showing: string;
    of: string;
    page: string;
    previousPage: string;
    nextPage: string;
  };
}

const DEFAULT_LABELS = {
  showing: 'Showing',
  of: 'of',
  page: 'Page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
};

export function PaginationBar({ pagination, onPageChange, labels }: PaginationBarProps) {
  if (!pagination || pagination.total === 0) return null;

  const { showing, of, page: pageLabel, previousPage, nextPage } = labels ?? DEFAULT_LABELS;
  const { page, pageSize, total, totalPages } = pagination;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-3 py-2">
      <p className="text-muted-foreground text-sm">
        {showing} <span className="text-foreground font-medium">{start}</span>&ndash;
        <span className="text-foreground font-medium">{end}</span> {of}{' '}
        <span className="text-foreground font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-11 sm:size-7"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={previousPage}
        >
          <ChevronLeft />
        </Button>
        <span className="text-muted-foreground px-2 text-sm whitespace-nowrap">
          {pageLabel} {page} {of} {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-11 sm:size-7"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={nextPage}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
