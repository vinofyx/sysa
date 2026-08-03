/**
 * Public site footer — minimal, verified-facts-only (Regd. No. and address
 * come straight from docs/PROJECT_CONTEXT.md). The full footer link set
 * (Donor Corner, Reports & Transparency, Privacy Policy, etc. — see
 * design/01-Information-Architecture.md §5) is added alongside those pages.
 */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto max-w-6xl px-4 py-8 text-sm">
        <p className="font-medium">Sai Yadadri Seva Ashram</p>
        <p>Regd. No. 423/2019 &middot; Sai Ram Nagar, Uppal, Hyderabad &ndash; 39, Telangana</p>
        <p className="mt-4">
          &copy; {new Date().getFullYear()} Sai Yadadri Seva Ashram. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
