import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';

export type WOStav = 'nova' | 'v_reseni' | 'vyresena' | 'uzavrena' | 'zrusena';
export type WOPriorita = 'nizka' | 'normalni' | 'vysoka' | 'kriticka';

export interface WorkOrder {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  nazev: string;
  popis?: string;
  priorita: WOPriorita;
  stav: WOStav;
  propId?: string | number;
  jednotkaId?: string;
  resitel?: string;
  zadavatel?: string;
  datumVytvoreni: string;
  terminDo?: string;
  datumUzavreni?: string;
  odhadovanaHodiny?: number;
  skutecneHodiny?: number;
  naklady?: number;
  komentare: WOKomentar[];
}

export interface WOKomentar {
  id: string;
  autor: string;
  text: string;
  datum: string;
}

const WO_KEY = 'estateos_work_orders';

interface WorkOrderStore {
  workOrders: WorkOrder[];
  load: () => void;
  getById: (id: string) => WorkOrder | undefined;
  create: (data: Partial<WorkOrder>) => WorkOrder;
  update: (id: string, data: Partial<WorkOrder>) => void;
  changeStav: (id: string, stav: WOStav) => void;
  addKomentar: (id: string, autor: string, text: string) => void;
  remove: (id: string) => void;
  getStats: () => { celkem: number; otevrene: number; kriticke: number; poTerminu: number };
}

type R = Record<string, unknown>;

function normalize(raw: R): WorkOrder {
  return {
    id: String(raw.id || ''),
    tenant_id: String(raw.tenant_id || ''),
    created_at: String(raw.created_at || ''),
    updated_at: String(raw.updated_at || ''),
    deleted_at: (raw.deleted_at as string | null) || null,
    nazev: String(raw.nazev || raw.title || ''),
    popis: raw.popis != null ? String(raw.popis) : raw.description != null ? String(raw.description) : undefined,
    priorita: (raw.priorita || raw.priority || 'normalni') as WOPriorita,
    stav: (raw.stav || raw.status || 'nova') as WOStav,
    propId: raw.propId ?? raw.property_id,
    jednotkaId: raw.jednotkaId != null ? String(raw.jednotkaId) : raw.unit_id != null ? String(raw.unit_id) : undefined,
    resitel: raw.resitel != null ? String(raw.resitel) : undefined,
    zadavatel: raw.zadavatel != null ? String(raw.zadavatel) : undefined,
    datumVytvoreni: String(raw.datumVytvoreni || raw.created_at || ''),
    terminDo: raw.terminDo != null ? String(raw.terminDo) : undefined,
    datumUzavreni: raw.datumUzavreni != null ? String(raw.datumUzavreni) : undefined,
    odhadovanaHodiny: raw.odhadovanaHodiny != null ? Number(raw.odhadovanaHodiny) : undefined,
    skutecneHodiny: raw.skutecneHodiny != null ? Number(raw.skutecneHodiny) : undefined,
    naklady: raw.naklady != null ? Number(raw.naklady) : undefined,
    komentare: Array.isArray(raw.komentare) ? raw.komentare as WOKomentar[] : [],
  };
}

export const useWorkOrderStore = create<WorkOrderStore>((set, get) => ({
  workOrders: [],

  load: () => {
    const raw = filterActive(loadFromStorage<R[]>(WO_KEY, []));
    set({ workOrders: raw.map(normalize) });
  },

  getById: (id) => get().workOrders.find(w => String(w.id) === String(id)),

  create: (data) => {
    const wo = normalize({
      ...makeEntityBase(),
      stav: 'nova',
      priorita: 'normalni',
      datumVytvoreni: new Date().toISOString().slice(0, 10),
      komentare: [],
      ...data,
    });
    const all = loadFromStorage<R[]>(WO_KEY, []);
    saveToStorage(WO_KEY, [...all, wo]);
    set(s => ({ workOrders: [...s.workOrders, wo] }));
    return wo;
  },

  update: (id, data) => {
    const all = loadFromStorage<R[]>(WO_KEY, []);
    const updated = all.map(w => String(w.id) === String(id)
      ? { ...w, ...data, updated_at: new Date().toISOString() } : w);
    saveToStorage(WO_KEY, updated);
    set({ workOrders: filterActive(updated).map(normalize) });
  },

  changeStav: (id, stav) => {
    const now = new Date().toISOString();
    const extra: Partial<WorkOrder> = {};
    if (stav === 'vyresena' || stav === 'uzavrena') extra.datumUzavreni = now.slice(0, 10);
    get().update(id, { stav, ...extra });
  },

  addKomentar: (id, autor, text) => {
    const wo = get().getById(id);
    if (!wo) return;
    const k: WOKomentar = { id: `wok-${Date.now()}`, autor, text, datum: new Date().toISOString() };
    get().update(id, { komentare: [...wo.komentare, k] });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<R[]>(WO_KEY, []);
    const updated = all.map(w => String(w.id) === String(id)
      ? { ...w, deleted_at: now, updated_at: now } : w);
    saveToStorage(WO_KEY, updated);
    set({ workOrders: filterActive(updated).map(normalize) });
  },

  getStats: () => {
    const { workOrders } = get();
    const today = new Date().toISOString().slice(0, 10);
    const closedSet = new Set<WOStav>(['vyresena', 'uzavrena', 'zrusena']);
    const otevrene = workOrders.filter(w => !closedSet.has(w.stav)).length;
    const kriticke = workOrders.filter(w => w.priorita === 'kriticka' && !closedSet.has(w.stav)).length;
    const poTerminu = workOrders.filter(w =>
      w.terminDo && w.terminDo < today && !closedSet.has(w.stav)
    ).length;
    return { celkem: workOrders.length, otevrene, kriticke, poTerminu };
  },
}));
