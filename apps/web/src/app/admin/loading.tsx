import { Skeleton } from '@/components/ui/skeleton';

/** Next.js route-segment loading UI — shown instantly while a Server Component
 * (e.g. the Admin layout's identity check) is resolving. */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
