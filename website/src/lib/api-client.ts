import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/lib/env';

/**
 * Shared Axios instance for all calls to the backend API (api).
 *
 * Auth is cookie-based (httpOnly access/refresh tokens set by the API — see
 * api/src/lib/cookies.ts), so `withCredentials: true` is required on every
 * request; there is no Authorization header for the browser to attach.
 */
export const apiClient = axios.create({
  baseURL: `${env.NEXT_PUBLIC_API_URL}/api/v1`,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<void> | null = null;

function isAuthEndpoint(url?: string): boolean {
  return !!url && ['/auth/login', '/auth/refresh', '/auth/logout'].some((p) => url.includes(p));
}

/**
 * On a 401 from any endpoint other than the auth endpoints themselves, attempt
 * exactly one silent refresh (via the httpOnly refresh cookie) and retry the
 * original request once. If the refresh also fails, the error propagates so the
 * caller's UI can redirect to /login — this is a UX convenience only; the real
 * authorization boundary is enforced server-side on every request regardless
 * (documentation/12-Security-Requirements.md SEC-AUTHZ-01).
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;

    if (error.response?.status !== 401 || !config || config._retry || isAuthEndpoint(config.url)) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      refreshPromise ??= apiClient.post('/auth/refresh').then(() => undefined);
      await refreshPromise;
      refreshPromise = null;
      return apiClient(config);
    } catch (refreshError) {
      refreshPromise = null;
      return Promise.reject(refreshError);
    }
  },
);
