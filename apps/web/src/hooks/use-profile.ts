'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient, type ApiErrorBody } from '@/lib/api-client';
import type { Profile, Session } from '@/types/auth';

const profileKeys = {
  profile: ['profile'] as const,
  sessions: ['auth', 'sessions'] as const,
};

export function useProfile() {
  return useQuery<Profile>({
    queryKey: profileKeys.profile,
    queryFn: async () => {
      const { data } = await apiClient.get<{ profile: Profile }>('/profile');
      return data.profile;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<Profile, AxiosError<ApiErrorBody>, { name: string }>({
    mutationFn: async (input) => {
      const { data } = await apiClient.patch<{ profile: Profile }>('/profile', input);
      return data.profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile, profile);
    },
  });
}

export function useSessions() {
  return useQuery<Session[]>({
    queryKey: profileKeys.sessions,
    queryFn: async () => {
      const { data } = await apiClient.get<{ sessions: Session[] }>('/auth/sessions');
      return data.sessions;
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (sessionId) => {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.sessions });
    },
  });
}
