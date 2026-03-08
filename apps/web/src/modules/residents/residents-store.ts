import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Resident {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  jmeno: string;
  email: string;
  telefon: string;
  propId: string | number;
  jednotkaId?: string;
  status: 'aktivni' | 'neaktivni' | 'vystehovan';
  datumNastehovani: string;
  datumVystehovani?: string;
  poznamka?: string;
}

export interface LeaseAgreement {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  propId: string | number;
  jednotkaId?: string;
  residentId?: string;
  najemnik: string;
  mesicniNajem: number;
  kauce?: number;
  datumOd: string;
  datumDo?: string;
  status: 'aktivni' | 'ukoncena' | 'pripravovana';
  poznamka?: string;
}

const RESIDENTS_KEY = 'estateos_residents';
const LEASES_KEY = 'estateos_lease_agreements';

interface ResidentsStore {
  residents: Resident[];
  leases: LeaseAgreement[];

  load: () => void;

  // Residents CRUD
  getById: (id: string) => Resident | undefined;
  getByProperty: (propId: string) => Resident[];
  create: (data: Partial<Resident>) => Resident;
  update: (id: string, data: Partial<Resident>) => void;
  remove: (id: string) => void;

  // Leases
  getLeasesByResident: (residentId: string) => LeaseAgreement[];
  createLease: (data: Partial<LeaseAgreement>) => LeaseAgreement;
  updateLease: (id: string, data: Partial<LeaseAgreement>) => void;
  terminateLease: (id: string) => void;

  // Stats
  getStats: () => { celkem: number; aktivnich: number; nemovitosti: number };
}

export const useResidentsStore = create<ResidentsStore>((set, get) => ({
  residents: [],
  leases: [],

  load: () => {
    set({
      residents: filterActive(loadFromStorage<Resident[]>(RESIDENTS_KEY, [])),
      leases: filterActive(loadFromStorage<LeaseAgreement[]>(LEASES_KEY, [])),
    });
  },

  getById: (id) => get().residents.find(r => String(r.id) === String(id)),

  getByProperty: (propId) => get().residents.filter(r => String(r.propId) === String(propId)),

  create: (data) => {
    const newR = {
      ...makeEntityBase(),
      jmeno: '', email: '', telefon: '', propId: '', status: 'aktivni' as const,
      datumNastehovani: new Date().toISOString().slice(0, 10),
      ...data,
    } as Resident;
    const all = loadFromStorage<Resident[]>(RESIDENTS_KEY, []);
    saveToStorage(RESIDENTS_KEY, [...all, newR]);
    set(s => ({ residents: [...s.residents, newR] }));
    return newR;
  },

  update: (id, data) => {
    const all = loadFromStorage<Resident[]>(RESIDENTS_KEY, []);
    const updated = all.map(r => String(r.id) === String(id)
      ? { ...r, ...data, updated_at: new Date().toISOString() } : r);
    saveToStorage(RESIDENTS_KEY, updated);
    set({ residents: filterActive(updated) });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<Resident[]>(RESIDENTS_KEY, []);
    const updated = all.map(r => String(r.id) === String(id)
      ? { ...r, deleted_at: now, updated_at: now } : r);
    saveToStorage(RESIDENTS_KEY, updated);
    set({ residents: filterActive(updated) });
  },

  getLeasesByResident: (residentId) => {
    const r = get().getById(residentId);
    if (!r) return [];
    return get().leases.filter(l =>
      String(l.residentId) === String(residentId) ||
      (r.jednotkaId && String(l.jednotkaId) === String(r.jednotkaId)) ||
      l.najemnik?.toLowerCase().includes((r.jmeno || '').split(' ')[0]?.toLowerCase() || '___')
    );
  },

  createLease: (data) => {
    const newL = {
      ...makeEntityBase(),
      propId: '', najemnik: '', mesicniNajem: 0, datumOd: '', status: 'aktivni' as const,
      ...data,
    } as LeaseAgreement;
    const all = loadFromStorage<LeaseAgreement[]>(LEASES_KEY, []);
    saveToStorage(LEASES_KEY, [...all, newL]);
    set(s => ({ leases: [...s.leases, newL] }));
    return newL;
  },

  updateLease: (id, data) => {
    const all = loadFromStorage<LeaseAgreement[]>(LEASES_KEY, []);
    const updated = all.map(l => String(l.id) === String(id)
      ? { ...l, ...data, updated_at: new Date().toISOString() } : l);
    saveToStorage(LEASES_KEY, updated);
    set({ leases: filterActive(updated) });
  },

  terminateLease: (id) => {
    const all = loadFromStorage<LeaseAgreement[]>(LEASES_KEY, []);
    const now = new Date().toISOString();
    const updated = all.map(l => String(l.id) === String(id)
      ? { ...l, status: 'ukoncena' as const, datumDo: now.slice(0, 10), updated_at: now } : l);
    saveToStorage(LEASES_KEY, updated);
    set({ leases: filterActive(updated) });
  },

  getStats: () => {
    const { residents } = get();
    const aktivnich = residents.filter(r => r.status === 'aktivni').length;
    const propIds = new Set(residents.map(r => String(r.propId)));
    return { celkem: residents.length, aktivnich, nemovitosti: propIds.size };
  },
}));
