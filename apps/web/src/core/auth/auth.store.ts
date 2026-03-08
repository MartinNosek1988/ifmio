import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { AuthUser, LoginRequest, RegisterRequest, AuthResponse } from './types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isLoggedIn: false,

  login: async (data) => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    const { accessToken, refreshToken, user } = res.data;
    localStorage.setItem('ifmio:access_token', accessToken);
    localStorage.setItem('ifmio:refresh_token', refreshToken);
    localStorage.setItem('ifmio:user', JSON.stringify(user));
    set({ user, isLoggedIn: true });
  },

  register: async (data) => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    const { accessToken, refreshToken, user } = res.data;
    localStorage.setItem('ifmio:access_token', accessToken);
    localStorage.setItem('ifmio:refresh_token', refreshToken);
    localStorage.setItem('ifmio:user', JSON.stringify(user));
    set({ user, isLoggedIn: true });
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('ifmio:access_token');
      localStorage.removeItem('ifmio:refresh_token');
      localStorage.removeItem('ifmio:user');
      set({ user: null, isLoggedIn: false });
    }
  },

  restoreSession: async () => {
    const cached = localStorage.getItem('ifmio:user');
    if (!cached) {
      set({ isLoading: false });
      return;
    }
    try {
      const res = await apiClient.get<AuthUser>('/auth/me');
      set({ user: res.data, isLoggedIn: true, isLoading: false });
    } catch {
      localStorage.removeItem('ifmio:access_token');
      localStorage.removeItem('ifmio:user');
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  },
}));
