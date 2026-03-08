import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';

export type LeaseStatus = 'aktivni' | 'ukoncena' | 'pozastavena' | 'pripravovana';

export interface LeaseAgreement {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  cisloSmlouvy?: string;
  najemnik: string;
  residentId?: string;
  propId: string | number;
  jednotkaId: string;
  mesicniNajem: number;
  kauce?: number;
  datumOd: string;
  datumDo?: string;
  status: LeaseStatus;
  poznamka?: string;
}

const LEASES_KEY = 'estateos_lease_agreements';

export function daysToExpiry(datumDo?: string): number | null {
  if (!datumDo) return null;
  return Math.ceil((new Date(datumDo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(lease: LeaseAgreement): boolean {
  const days = daysToExpiry(lease.datumDo);
  return days !== null && days >= 0 && days <= 90 && lease.status === 'aktivni';
}

type R = Record<string, unknown>;

function normalize(raw: R): LeaseAgreement {
  return {
    id: String(raw.id || ''),
    tenant_id: String(raw.tenant_id || ''),
    created_at: String(raw.created_at || ''),
    updated_at: String(raw.updated_at || ''),
    deleted_at: (raw.deleted_at as string | null) || null,
    cisloSmlouvy: raw.cisloSmlouvy != null ? String(raw.cisloSmlouvy) : undefined,
    najemnik: String(raw.najemnik || ''),
    residentId: raw.residentId != null ? String(raw.residentId) : undefined,
    propId: raw.propId ?? raw.property_id ?? '',
    jednotkaId: String(raw.jednotkaId || raw.unit_id || ''),
    mesicniNajem: Number(raw.mesicniNajem) || 0,
    kauce: raw.kauce != null ? Number(raw.kauce) : undefined,
    datumOd: String(raw.datumOd || ''),
    datumDo: raw.datumDo != null ? String(raw.datumDo) : undefined,
    status: (raw.status || 'aktivni') as LeaseStatus,
    poznamka: raw.poznamka != null ? String(raw.poznamka) : undefined,
  };
}

interface ContractsStore {
  agreements: LeaseAgreement[];
  load: () => void;
  getById: (id: string) => LeaseAgreement | undefined;
  create: (data: Partial<LeaseAgreement>) => LeaseAgreement;
  update: (id: string, data: Partial<LeaseAgreement>) => void;
  terminate: (id: string, datumUkonceni: string) => void;
  remove: (id: string) => void;
  getStats: () => { total: number; active: number; monthlyTotal: number; expiringSoon: number };
}

export const useContractsStore = create<ContractsStore>((set, get) => ({
  agreements: [],

  load: () => {
    const raw = filterActive(loadFromStorage<R[]>(LEASES_KEY, []));
    set({ agreements: raw.map(normalize) });
  },

  getById: (id) => get().agreements.find(l => String(l.id) === String(id)),

  create: (data) => {
    const year = new Date().getFullYear();
    const all = loadFromStorage<R[]>(LEASES_KEY, []);
    const count = all.length + 1;
    const lease = normalize({
      ...makeEntityBase(),
      status: 'aktivni',
      datumOd: new Date().toISOString().slice(0, 10),
      cisloSmlouvy: `NS-${year}-${String(count).padStart(3, '0')}`,
      ...data,
    });
    saveToStorage(LEASES_KEY, [...all, lease]);
    set(s => ({ agreements: [...s.agreements, lease] }));
    return lease;
  },

  update: (id, data) => {
    const all = loadFromStorage<R[]>(LEASES_KEY, []);
    const updated = all.map(l => String(l.id) === String(id)
      ? { ...l, ...data, updated_at: new Date().toISOString() } : l);
    saveToStorage(LEASES_KEY, updated);
    set({ agreements: filterActive(updated).map(normalize) });
  },

  terminate: (id, datumUkonceni) => {
    get().update(id, { status: 'ukoncena' as LeaseStatus, datumDo: datumUkonceni });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<R[]>(LEASES_KEY, []);
    const updated = all.map(l => String(l.id) === String(id)
      ? { ...l, deleted_at: now, updated_at: now } : l);
    saveToStorage(LEASES_KEY, updated);
    set({ agreements: filterActive(updated).map(normalize) });
  },

  getStats: () => {
    const { agreements } = get();
    const active = agreements.filter(l => l.status === 'aktivni');
    return {
      total: agreements.length,
      active: active.length,
      monthlyTotal: active.reduce((s, l) => s + l.mesicniNajem, 0),
      expiringSoon: agreements.filter(isExpiringSoon).length,
    };
  },
}));
