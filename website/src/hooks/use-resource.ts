'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import type { PaginatedResult } from '@/types/pagination';

interface ResourceHooksOptions {
  /** TanStack Query cache key root for this resource. */
  resourceKey: string;
  /** API base path, e.g. `/testimonials` — relative to `/api/v1`. */
  basePath: string;
}

/**
 * Generic data-fetching/mutation hook factory for admin CRUD pages. Every
 * Phase 5 list endpoint returns the same `{ data, pagination }` envelope
 * (api/src/utils/pagination.ts) and every single-resource endpoint
 * returns `{ data }` (buildSimpleCrudRouter and every hand-written module
 * router follow the same convention — see design/13-API-Architecture.md §6),
 * so one factory covers list/detail/create/update/delete/reorder for every
 * module instead of hand-writing near-identical hooks per resource.
 */
export function createResourceHooks<
  TEntity,
  TCreate = Partial<TEntity>,
  TUpdate = Partial<TEntity>,
>({ resourceKey, basePath }: ResourceHooksOptions) {
  const keys = {
    all: [resourceKey] as const,
    list: (params?: Record<string, unknown>) => [resourceKey, 'list', params ?? {}] as const,
    detail: (id: string) => [resourceKey, 'detail', id] as const,
  };

  function useList(params?: Record<string, unknown>) {
    return useQuery<PaginatedResult<TEntity>>({
      queryKey: keys.list(params),
      queryFn: async () => {
        const { data } = await apiClient.get<PaginatedResult<TEntity>>(basePath, { params });
        return data;
      },
      placeholderData: keepPreviousData,
    });
  }

  function useDetail(id: string | undefined) {
    return useQuery<TEntity>({
      queryKey: keys.detail(id ?? ''),
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: TEntity }>(`${basePath}/${id}`);
        return data.data;
      },
      enabled: !!id,
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation<TEntity, AxiosError<ApiErrorBody>, TCreate>({
      mutationFn: async (input) => {
        const { data } = await apiClient.post<{ data: TEntity }>(basePath, input);
        return data.data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation<TEntity, AxiosError<ApiErrorBody>, { id: string; input: TUpdate }>({
      mutationFn: async ({ id, input }) => {
        const { data } = await apiClient.patch<{ data: TEntity }>(`${basePath}/${id}`, input);
        return data.data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  function useDelete() {
    const queryClient = useQueryClient();
    return useMutation<void, AxiosError<ApiErrorBody>, string>({
      mutationFn: async (id) => {
        await apiClient.delete(`${basePath}/${id}`);
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  function useReorder() {
    const queryClient = useQueryClient();
    return useMutation<void, AxiosError<ApiErrorBody>, { id: string; displayOrder: number }[]>({
      mutationFn: async (items) => {
        await apiClient.patch(`${basePath}/bulk/reorder`, { items });
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  return { keys, useList, useDetail, useCreate, useUpdate, useDelete, useReorder };
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  return axiosError?.response?.data?.error?.message ?? fallback;
}
