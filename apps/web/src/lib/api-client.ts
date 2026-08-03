import axios from 'axios';

import { env } from '@/lib/env';

/**
 * Shared Axios instance for all calls to the backend API (apps/api).
 * Base URL and versioning (/api/v1) are configured here once, per
 * design/13-API-Architecture.md §6 — individual feature modules (added in the
 * next development phase) build on top of this client rather than each
 * constructing their own request configuration.
 */
export const apiClient = axios.create({
  baseURL: `${env.NEXT_PUBLIC_API_URL}/api/v1`,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // Auth token attachment is wired in alongside the actual admin login flow
  // (see documentation/13-API-Requirements.md §4.1) in the feature-development phase.
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralized error normalization point — expanded when real endpoints
    // (and the error envelope from design/13-API-Architecture.md §7) land.
    return Promise.reject(error);
  },
);
