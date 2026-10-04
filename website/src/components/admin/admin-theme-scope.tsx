'use client';

import { useLayoutEffect } from 'react';

/**
 * Base UI portals (dialog, dropdown-menu, popover, select, ...) render as
 * direct children of `<body>`, escaping the `.admin-content` token scope
 * applied to `admin/layout.tsx`'s `<main>` (see `admin.css`). Mirrors that
 * class onto `<body>` for as long as an admin page is mounted — the same
 * technique `next-themes` itself uses for the `.dark` class — so portaled
 * content picks up the brand palette instead of falling back to
 * `globals.css`'s stock shadcn tokens. Public-site pages never mount this,
 * so `<body>` is untouched outside `/admin`.
 */
export function AdminThemeScope() {
  useLayoutEffect(() => {
    document.body.classList.add('admin-content');
    return () => {
      document.body.classList.remove('admin-content');
    };
  }, []);

  return null;
}
