import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';

/**
 * Placeholder root page — confirms the build pipeline (Next.js + TypeScript +
 * Tailwind + shadcn/ui) is wired correctly. Actual site pages (Home, About,
 * Donate, etc. per design/02-Sitemap.md) are implemented in the next
 * development phase — see DEVELOPMENT_PROGRESS.md.
 */
export default function RootPlaceholderPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Sai Yadadri Seva Ashram Platform</h1>
      <p className="text-muted-foreground max-w-md">
        Project foundation initialized. Site pages and features are implemented in the next
        development phase.
      </p>
      <Button
        render={
          <a href={`${env.NEXT_PUBLIC_API_URL}/api/v1/health`} target="_blank" rel="noreferrer" />
        }
      >
        Check API Health
      </Button>
    </main>
  );
}
