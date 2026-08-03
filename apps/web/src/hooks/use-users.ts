'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { AdminUserSummary, PaginatedResult } from '@/types/auth';

/** Used by the dashboard's real "Admin Users" stat card — gated on the caller
 * holding `users:view` via the `enabled` option (see app/admin/page.tsx). */
export function useUsersCount(enabled: boolean) {
  return useQuery<PaginatedResult<AdminUserSummary>>({
    queryKey: ['users', { page: 1, pageSize: 1 }],
    queryFn: async () => {
      const { data } = await apiClient.get('/users', { params: { page: 1, pageSize: 1 } });
      return data;
    },
    enabled,
  });
}
