'use client';

import { useEffect, useState } from 'react';

import { useMe } from '@/hooks/use-auth';

/** Whether the current admin session carries the given permission code —
 * gates action buttons (Add/Edit/Delete) within pages the Sidebar already
 * only shows for authorized roles; this is a UX nicety, not the security
 * boundary (the backend enforces every permission on every request).
 *
 * `useMe()`'s cache can already be warm (e.g. from a previous admin page)
 * by the time this mounts, so the permission check itself must not run on
 * the very first client render — that render has to match the server's
 * (always permission-less) output, or React flags a hydration mismatch.
 * Deferring the real check to a post-mount effect keeps the first paint
 * identical on server and client; the gated UI then appears a tick later,
 * which is an ordinary post-hydration update, not a mismatch. */
export function useHasPermission(code: string): boolean {
  const { data: user } = useMe();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && !!user?.permissions.includes(code);
}
