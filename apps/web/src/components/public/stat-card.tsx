/** design/09-Animation-Specifications.md explicitly avoids counting-up number
 * animations for impact stats ("adds no informational value, risks jank") —
 * this renders the admin-entered value as static text, deliberately. */
export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-pub-neutral-200 flex flex-col items-center gap-1 rounded-xl border bg-white p-6 text-center">
      <p className="font-pub-heading text-pub-primary-700 text-3xl font-bold sm:text-4xl">
        {value}
      </p>
      <p className="text-pub-neutral-500 text-sm">{label}</p>
    </div>
  );
}
