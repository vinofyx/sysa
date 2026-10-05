'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import type { AuthUser } from '@/types/auth';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

/**
 * The authenticated identity + permission set for the current session — the
 * single source of truth the Admin layout, Sidebar, and route guards read from.
 * Returns `null` (not an error state) when unauthenticated, so callers can
 * branch on `data` directly instead of juggling `isError`.
 */
export function useMe() {
  return useQuery<AuthUser | null>({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ user: AuthUser }>('/auth/me');
        return data.user;
      } catch (error) {
        const status = (error as AxiosError).response?.status;
        if (status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

interface LoginInput {
  email: string;
  password: string;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<{ user: AuthUser }, AxiosError<ApiErrorBody>, LoginInput>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post('/auth/login', input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorBody>>({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}

export function useLogoutAllDevices() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorBody>>({
    mutationFn: async () => {
      await apiClient.post('/auth/logout-all');
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}

export function useForgotPassword() {
  return useMutation<{ message: string }, AxiosError<ApiErrorBody>, { email: string }>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post('/auth/forgot-password', input);
      return data;
    },
  });
}

export function useResetPassword() {
  return useMutation<
    { message: string },
    AxiosError<ApiErrorBody>,
    { token: string; newPassword: string }
  >({
    mutationFn: async (input) => {
      const { data } = await apiClient.post('/auth/reset-password', input);
      return data;
    },
  });
}

export function useVerifyEmail() {
  return useMutation<{ message: string }, AxiosError<ApiErrorBody>, { token: string }>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post('/auth/verify-email', input);
      return data;
    },
  });
}

export function useResendVerification() {
  return useMutation<{ message: string }, AxiosError<ApiErrorBody>, { email: string }>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post('/auth/resend-verification', input);
      return data;
    },
  });
}

export function useChangePassword() {
  return useMutation<
    { message: string },
    AxiosError<ApiErrorBody>,
    { currentPassword: string; newPassword: string }
  >({
    mutationFn: async (input) => {
      const { data } = await apiClient.post('/auth/change-password', input);
      return data;
    },
  });
}
