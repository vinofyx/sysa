'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient, type ApiErrorBody } from '@/lib/api-client';

export type PageKey = 'home' | 'about' | 'contact';

export interface PageContent {
  pageKey: string;
  blocksEn: Record<string, unknown>;
  blocksTe: Record<string, unknown> | null;
  updatedAt: string | null;
}

const keys = {
  detail: (pageKey: PageKey) => ['page-content', pageKey] as const,
};

export function usePageContent(pageKey: PageKey) {
  return useQuery<PageContent>({
    queryKey: keys.detail(pageKey),
    queryFn: async () => {
      const { data } = await apiClient.get<{ content: PageContent }>(`/page-content/${pageKey}`);
      return data.content;
    },
  });
}

export function useUpdatePageContent(pageKey: PageKey) {
  const queryClient = useQueryClient();
  return useMutation<
    PageContent,
    AxiosError<ApiErrorBody>,
    { blocksEn: Record<string, unknown>; blocksTe?: Record<string, unknown> }
  >({
    mutationFn: async (input) => {
      const { data } = await apiClient.patch<{ content: PageContent }>(
        `/page-content/${pageKey}`,
        input,
      );
      return data.content;
    },
    onSuccess: (content) => {
      queryClient.setQueryData(keys.detail(pageKey), content);
    },
  });
}
