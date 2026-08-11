import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { BreadcrumbItem } from '@/components/shared/breadcrumb';

/** Dark-background breadcrumb for `PageHero` only — the shared
 * `components/shared/breadcrumb.tsx` uses admin (shadcn) text tokens tuned
 * for a light background, which would be unreadable on the emerald gradient
 * below; that shared component (also used by /admin) is left untouched. */
function HeroBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-white/60">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={item.label}>
            {index > 0 && <ChevronRight className="mx-1.5 size-3.5 shrink-0" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} className="font-medium text-white">
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

/** Title banner used at the top of every interior public page
 * (design/05-Wireframes.md "Title Banner" pattern). */
export function PageHero({
  title,
  description,
  breadcrumb,
}: {
  title: string;
  description?: string;
  breadcrumb: BreadcrumbItem[];
}) {
  return (
    <div className="pub-gradient-emerald relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      <div
        aria-hidden
        className="pub-gradient-gold absolute top-1/2 -left-24 size-72 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
      />
      <div className="relative mx-auto max-w-[1400px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <HeroBreadcrumb items={breadcrumb} />
        <span className="pub-divider-gold mt-5" />
        <h1 className="font-pub-heading mt-4 text-3xl font-semibold text-balance text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
