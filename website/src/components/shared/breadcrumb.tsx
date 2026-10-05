import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Minimal breadcrumb — hand-written rather than via the shadcn CLI (kept
 * dependency-free) per design/01-Information-Architecture.md §9, which calls
 * for breadcrumbs on every interior admin/content page so non-technical users
 * always know where they are.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground flex min-w-0 items-center text-sm"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={`${index}-${item.label}`}>
            {index > 0 && (
              <ChevronRight className="mx-1.5 size-3.5 shrink-0 max-sm:hidden" aria-hidden="true" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground shrink-0 transition-colors max-sm:hidden"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? 'page' : undefined}
                className="text-foreground min-w-0 truncate font-medium"
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
