'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient, type ApiErrorBody } from '@/lib/api-client';

export interface SiteSettings {
  siteNameEn: string;
  siteNameTe: string | null;
  taglineEn: string | null;
  taglineTe: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  contactAddressEn: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactHoursEn: string | null;
  whatsappNumber: string | null;
  mapLatitude: string | null;
  mapLongitude: string | null;
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
  defaultOgImageUrl: string | null;
  footerTextEn: string | null;
  copyrightText: string | null;
  maintenanceMode: boolean;
}

const key = ['site-settings'] as const;

export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: key,
    queryFn: async () => {
      const { data } = await apiClient.get<{ settings: SiteSettings }>('/site-settings');
      return data.settings;
    },
  });
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();
  return useMutation<SiteSettings, AxiosError<ApiErrorBody>, Partial<SiteSettings>>({
    mutationFn: async (input) => {
      const { data } = await apiClient.patch<{ settings: SiteSettings }>('/site-settings', input);
      return data.settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(key, settings);
    },
  });
}
