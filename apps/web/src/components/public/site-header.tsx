import Link from 'next/link';

/**
 * Public site header — foundation only. The full navigation defined in
 * design/01-Information-Architecture.md §4 (Home / About / Activities / Donate /
 * Gallery / Events / Get Involved) lights up page-by-page as those business
 * pages are built (Phase 5+); until then this only links to routes that
 * actually exist, rather than to placeholder 404s.
 */
export function SiteHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Sai Yadadri Seva Ashram
        </Link>
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          Admin Login
        </Link>
      </div>
    </header>
  );
}
