'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient, type ApiErrorBody } from '@/lib/api-client';
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

export function useUsers(params: Record<string, unknown>) {
  return useQuery<PaginatedResult<AdminUserSummary>>({
    queryKey: ['users', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<AdminUserSummary>>('/users', { params });
      return data;
    },
  });
}

interface CreateUserInput {
  name: string;
  email: string;
  roleId: string;
}

interface UpdateUserInput {
  name?: string;
  roleId?: string;
  active?: boolean;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation<AdminUserSummary, AxiosError<ApiErrorBody>, CreateUserInput>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<{ user: AdminUserSummary }>('/users', input);
      return data.user;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation<
    AdminUserSummary,
    AxiosError<ApiErrorBody>,
    { id: string; input: UpdateUserInput }
  >({
    mutationFn: async ({ id, input }) => {
      const { data } = await apiClient.patch<{ user: AdminUserSummary }>(`/users/${id}`, input);
      return data.user;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
