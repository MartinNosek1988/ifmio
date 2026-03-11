import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('ifmio:access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ─── token refresh logic ─────────────────────────────────────── */

let isRefreshing = false;
let pendingQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processPendingQueue(token: string | null, error: unknown) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

function forceLogout() {
  sessionStorage.removeItem('ifmio:access_token');
  sessionStorage.removeItem('ifmio:refresh_token');
  sessionStorage.removeItem('ifmio:user');
  window.location.href = '/login';
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401 and if we haven't already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh auth endpoints themselves
    const url = originalRequest.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register')) {
      return Promise.reject(error);
    }

    const refreshToken = sessionStorage.getItem('ifmio:refresh_token');
    if (!refreshToken) {
      forceLogout();
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest._retry = true;
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });

      const newAccessToken: string = data.accessToken;
      const newRefreshToken: string = data.refreshToken;

      sessionStorage.setItem('ifmio:access_token', newAccessToken);
      sessionStorage.setItem('ifmio:refresh_token', newRefreshToken);
      if (data.user) sessionStorage.setItem('ifmio:user', JSON.stringify(data.user));

      processPendingQueue(newAccessToken, null);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processPendingQueue(null, refreshError);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
