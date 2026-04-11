import { create } from 'zustand';
import { apiClient } from '../api/client';
import i18n from '../i18n';
import type { AuthUser, LoginRequest, RegisterRequest, AuthResponse } from './types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  passwordExpired: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  passwordExpired: false,

  login: async (data) => {
    const res = await apiClient.post<AuthResponse & { passwordExpired?: boolean }>('/auth/login', data);
    const { accessToken, refreshToken, user, passwordExpired } = res.data;
    sessionStorage.setItem('ifmio:access_token', accessToken);
    sessionStorage.setItem('ifmio:refresh_token', refreshToken);
    sessionStorage.setItem('ifmio:user', JSON.stringify(user));
    set({ user, isLoggedIn: true, isLoading: false, passwordExpired: !!passwordExpired });
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

    // Set cached user SYNCHRONOUSLY so uxRole is correct immediately
    try {
      const cachedUser: AuthUser = JSON.parse(cached);
      set({ user: cachedUser, isLoggedIn: true });
    } catch {
      // Corrupted cache — clear and bail
      sessionStorage.removeItem('ifmio:user');
      set({ isLoading: false });
      return;
    }

    // Async refresh from API — updates user data + clears isLoading
    try {
      const res = await apiClient.get<AuthUser>('/auth/me');
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
