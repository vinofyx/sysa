'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import type { Role } from '@/types/auth';

const keys = {
  all: ['roles'] as const,
  detail: (id: string) => ['roles', id] as const,
};

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: keys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<{ roles: Role[] }>('/roles');
      return data.roles;
    },
  });
}

interface CreateRoleInput {
  name: string;
  description?: string;
  permissionCodes: string[];
}

interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionCodes?: string[];
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation<Role, AxiosError<ApiErrorBody>, CreateRoleInput>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<{ role: Role }>('/roles', input);
      return data.role;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation<Role, AxiosError<ApiErrorBody>, { id: string; input: UpdateRoleInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await apiClient.patch<{ role: Role }>(`/roles/${id}`, input);
      return data.role;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function usePermissionsCatalogue() {
  return useQuery<{ id: string; code: string; description: string | null }[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        permissions: { id: string; code: string; description: string | null }[];
      }>('/permissions');
      return data.permissions;
    },
  });
}
