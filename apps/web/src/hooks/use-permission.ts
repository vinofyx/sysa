'use client';

import { useMe } from '@/hooks/use-auth';

/** Whether the current admin session carries the given permission code —
 * gates action buttons (Add/Edit/Delete) within pages the Sidebar already
 * only shows for authorized roles; this is a UX nicety, not the security
 * boundary (the backend enforces every permission on every request). */
export function useHasPermission(code: string): boolean {
  const { data: user } = useMe();
  return !!user?.permissions.includes(code);
}
