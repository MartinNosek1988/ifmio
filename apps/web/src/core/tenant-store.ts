import { create } from 'zustand';

export interface Tenant {
  id: string;
  nazev: string;
  plan: 'free' | 'pro' | 'enterprise';
}

interface TenantState {
  currentTenant: Tenant | null;
  setTenant: (t: Tenant | null) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  currentTenant: null,
  setTenant: (t) => set({ currentTenant: t }),
}));
