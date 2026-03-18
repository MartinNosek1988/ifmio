import { create } from 'zustand';
import { apiClient } from '../api/client';
import i18n from '../i18n';
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
    sessionStorage.setItem('ifmio:access_token', accessToken);
    sessionStorage.setItem('ifmio:refresh_token', refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(user));
    set({ user, isLoggedIn: true });
  },

  register: async (data) => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    const { accessToken, refreshToken, user } = res.data;
    sessionStorage.setItem('ifmio:access_token', accessToken);
    sessionStorage.setItem('ifmio:refresh_token', refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(user));
    set({ user, isLoggedIn: true });
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      sessionStorage.removeItem('ifmio:access_token');
      sessionStorage.removeItem('ifmio:refresh_token');
      sessionStorage.removeItem('ifmio:user');
      set({ user: null, isLoggedIn: false });
    }
  },

  restoreSession: async () => {
    const cached = sessionStorage.getItem('ifmio:user');
    if (!cached) {
      set({ isLoading: false });
      return;
    }
    try {
      const res = await apiClient.get<AuthUser>('/auth/me');
      // Sync i18n language from user profile
      if (res.data.language && res.data.language !== i18n.language) {
        i18n.changeLanguage(res.data.language);
      }
      set({ user: res.data, isLoggedIn: true, isLoading: false });
    } catch {
      sessionStorage.removeItem('ifmio:access_token');
      sessionStorage.removeItem('ifmio:user');
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  },
}));
