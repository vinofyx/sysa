import { AnimatedCounter, Reveal } from '@/components/public/motion';

export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Reveal
      variant="scale"
      className="pub-glass shadow-pub-md group relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[var(--radius-pub-card)] p-7 text-center transition-transform duration-300 hover:-translate-y-1"
    >
      <div
        aria-hidden
        className="pub-gradient-gold pointer-events-none absolute -top-10 -right-10 size-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
      />
      <AnimatedCounter
        value={value}
        className="font-pub-heading text-pub-primary-800 relative text-3xl font-bold sm:text-4xl"
      />
      <p className="text-pub-neutral-500 relative text-sm font-medium">{label}</p>
    </Reveal>
  );
}
