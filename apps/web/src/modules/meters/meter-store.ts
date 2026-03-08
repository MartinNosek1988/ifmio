import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';
import { useMeterReadingStore } from './meter-reading-store';

export interface Meter {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  nazev: string;
  cislo: string;
  typ: string;
  jednotka: string;
  propId: string | number;
  jednotkaId?: string;
  posledniOdecet?: number;
  datumOdectu?: string;
}

const METERS_KEY = 'estateos_meters';

type R = Record<string, unknown>;

function normalize(raw: R): Meter {
  return {
    id: String(raw.id || ''),
    tenant_id: String(raw.tenant_id || ''),
    created_at: String(raw.created_at || ''),
    updated_at: String(raw.updated_at || ''),
    deleted_at: (raw.deleted_at as string | null) || null,
    nazev: String(raw.nazev || ''),
    cislo: String(raw.cislo || raw.vyrobni_cislo || ''),
    typ: String(raw.typ || ''),
    jednotka: String(raw.jednotka || ''),
    propId: raw.propId ?? raw.property_id ?? '',
    jednotkaId: raw.jednotkaId != null ? String(raw.jednotkaId) : raw.unit_id != null ? String(raw.unit_id) : undefined,
    posledniOdecet: raw.posledniOdecet != null ? Number(raw.posledniOdecet) : undefined,
    datumOdectu: raw.datumOdectu != null ? String(raw.datumOdectu) : undefined,
  };
}

interface MeterStore {
  meters: Meter[];
  load: () => void;
  getById: (id: string) => Meter | undefined;
  createMeter: (data: Partial<Meter>) => Meter;
  updateMeter: (id: string, data: Partial<Meter>) => void;
  deleteMeter: (id: string) => void;
  addReading: (meterId: string, stav: number, datum: string, poznamka?: string) => void;
  getStats: () => { celkem: number; elektrina: number; voda: number; plynTeplo: number };
}

export const useMeterStore = create<MeterStore>((set, get) => ({
  meters: [],

  load: () => {
    const raw = filterActive(loadFromStorage<R[]>(METERS_KEY, []));
    set({ meters: raw.map(normalize) });
  },

  getById: (id) => get().meters.find(m => String(m.id) === String(id)),

  createMeter: (data) => {
    const m = normalize({
      ...makeEntityBase(),
      typ: 'elektrina',
      jednotka: 'kWh',
      ...data,
    });
    const all = loadFromStorage<R[]>(METERS_KEY, []);
    saveToStorage(METERS_KEY, [...all, m]);
    set(s => ({ meters: [...s.meters, m] }));
    return m;
  },

  updateMeter: (id, data) => {
    const all = loadFromStorage<R[]>(METERS_KEY, []);
    const updated = all.map(m => String(m.id) === String(id)
      ? { ...m, ...data, updated_at: new Date().toISOString() } : m);
    saveToStorage(METERS_KEY, updated);
    set({ meters: filterActive(updated).map(normalize) });
  },

  deleteMeter: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<R[]>(METERS_KEY, []);
    const updated = all.map(m => String(m.id) === String(id)
      ? { ...m, deleted_at: now, updated_at: now } : m);
    saveToStorage(METERS_KEY, updated);
    set({ meters: filterActive(updated).map(normalize) });
  },

  addReading: (meterId, stav, datum, poznamka) => {
    // Use the reading store
    const readingStore = useMeterReadingStore.getState();
    readingStore.addReading(meterId, datum, stav, undefined, poznamka);
    // Update meter's last reading
    get().updateMeter(meterId, { posledniOdecet: stav, datumOdectu: datum });
  },

  getStats: () => {
    const { meters } = get();
    return {
      celkem: meters.length,
      elektrina: meters.filter(m => m.typ === 'elektrina').length,
      voda: meters.filter(m => m.typ === 'voda_studena' || m.typ === 'voda_tepla').length,
      plynTeplo: meters.filter(m => m.typ === 'plyn' || m.typ === 'teplo').length,
    };
  },
}));
