import type { BreadcrumbItem } from '@/components/shared/breadcrumb';
import { Breadcrumb } from '@/components/shared/breadcrumb';

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
    <div className="bg-pub-primary-100 border-pub-neutral-200 border-b">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={breadcrumb} />
        <h1 className="font-pub-heading text-pub-primary-900 mt-3 text-2xl font-bold sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="text-pub-neutral-500 mt-2 max-w-2xl text-sm sm:text-base">{description}</p>
        )}
      </div>
    </div>
  );
}
