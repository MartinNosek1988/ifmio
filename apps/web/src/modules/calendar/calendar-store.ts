import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';

export type EventTyp = 'schuze' | 'revize' | 'udrzba' | 'predani' | 'prohlidka' | 'ostatni';

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  nazev: string;
  typ: EventTyp;
  datum: string;
  cas?: string;
  datumDo?: string;
  casDo?: string;
  propId?: string | number;
  popis?: string;
  misto?: string;
  ucastnici?: string[];
}

const CAL_KEY = 'estateos_calendar';

type R = Record<string, unknown>;

function normalize(raw: R): CalendarEvent {
  return {
    id: String(raw.id || ''),
    tenant_id: String(raw.tenant_id || ''),
    created_at: String(raw.created_at || ''),
    updated_at: String(raw.updated_at || ''),
    deleted_at: (raw.deleted_at as string | null) || null,
    nazev: String(raw.nazev || raw.title || ''),
    typ: (raw.typ || raw.type || 'ostatni') as EventTyp,
    datum: String(raw.datum || raw.date || ''),
    cas: raw.cas != null ? String(raw.cas) : raw.time != null ? String(raw.time) : undefined,
    datumDo: raw.datumDo != null ? String(raw.datumDo) : undefined,
    casDo: raw.casDo != null ? String(raw.casDo) : undefined,
    propId: raw.propId ?? raw.property_id,
    popis: raw.popis != null ? String(raw.popis) : raw.description != null ? String(raw.description) : undefined,
    misto: raw.misto != null ? String(raw.misto) : raw.location != null ? String(raw.location) : undefined,
    ucastnici: Array.isArray(raw.ucastnici) ? raw.ucastnici.map(String) : undefined,
  };
}

interface CalendarStore {
  events: CalendarEvent[];
  load: () => void;
  getById: (id: string) => CalendarEvent | undefined;
  getByMonth: (year: number, month: number) => CalendarEvent[];
  getUpcoming: (days?: number) => CalendarEvent[];
  create: (data: Partial<CalendarEvent>) => CalendarEvent;
  update: (id: string, data: Partial<CalendarEvent>) => void;
  remove: (id: string) => void;
  getStats: () => { celkem: number; nadchazejici: number; tentoMesic: number };
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],

  load: () => {
    const raw = filterActive(loadFromStorage<R[]>(CAL_KEY, []));
    set({ events: raw.map(normalize) });
  },

  getById: (id) => get().events.find(e => String(e.id) === String(id)),

  getByMonth: (year, month) =>
    get().events.filter(e => {
      const d = new Date(e.datum);
      return d.getFullYear() === year && d.getMonth() === month;
    }),

  getUpcoming: (days = 90) => {
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return get().events
      .filter(e => {
        const d = new Date(e.datum);
        return d >= now && d <= limit;
      })
      .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());
  },

  create: (data) => {
    const e = normalize({ ...makeEntityBase(), typ: 'ostatni', datum: new Date().toISOString().slice(0, 10), ...data });
    const all = loadFromStorage<R[]>(CAL_KEY, []);
    saveToStorage(CAL_KEY, [...all, e]);
    set(s => ({ events: [...s.events, e] }));
    return e;
  },

  update: (id, data) => {
    const all = loadFromStorage<R[]>(CAL_KEY, []);
    const updated = all.map(e => String(e.id) === String(id)
      ? { ...e, ...data, updated_at: new Date().toISOString() } : e);
    saveToStorage(CAL_KEY, updated);
    set({ events: filterActive(updated).map(normalize) });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<R[]>(CAL_KEY, []);
    const updated = all.map(e => String(e.id) === String(id)
      ? { ...e, deleted_at: now, updated_at: now } : e);
    saveToStorage(CAL_KEY, updated);
    set({ events: filterActive(updated).map(normalize) });
  },

  getStats: () => {
    const { events, getUpcoming } = get();
    const now = new Date();
    const thisMonth = events.filter(e => {
      const d = new Date(e.datum);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return {
      celkem: events.length,
      nadchazejici: getUpcoming(90).length,
      tentoMesic: thisMonth.length,
    };
  },
}));
