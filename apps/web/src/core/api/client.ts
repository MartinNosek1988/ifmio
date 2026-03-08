import axios from 'axios';
import type { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ifmio:access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ifmio:access_token');
      localStorage.removeItem('ifmio:refresh_token');
      localStorage.removeItem('ifmio:user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
