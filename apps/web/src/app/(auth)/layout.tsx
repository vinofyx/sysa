import Link from 'next/link';

/**
 * Auth layout — the minimal chrome wrapping login/forgot-password/reset-password/
 * verify-email. Deliberately spare (no main nav/footer) so nothing distracts from
 * the task at hand, per design/05-Wireframes.md's auth-flow pattern.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Sai Yadadri Seva Ashram
        </Link>
        <p className="text-muted-foreground text-sm">Admin Platform</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
