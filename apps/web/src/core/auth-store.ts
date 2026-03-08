import { create } from 'zustand';


export interface User {
  id: string;
  jmeno: string;
  email: string;
  role: string;
}

interface AuthState {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  loadUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  login: (user) => {
    sessionStorage.setItem('estateos_user', JSON.stringify(user));
    set({ currentUser: user });
  },
  logout: () => {
    sessionStorage.removeItem('estateos_user');
    set({ currentUser: null });
  },
  loadUser: () => {
    try {
      const raw = sessionStorage.getItem('estateos_user');
      if (raw) set({ currentUser: JSON.parse(raw) });
    } catch { /* ignore */ }
  },
}));
