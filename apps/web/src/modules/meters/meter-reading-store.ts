import { create } from 'zustand';
import type { MeterReading } from '../../shared/schema/meter';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';

const STORAGE_KEY = 'estateos_meter_readings';

interface MeterReadingStore {
  readings: MeterReading[];
  load: () => void;
  getByMeter: (meterId: string) => MeterReading[];
  getLatest: (meterId: string) => MeterReading | undefined;
  addReading: (meterId: string, datum: string, stav: number, userId?: string, poznamka?: string) => MeterReading;
  deleteReading: (id: string) => void;
}

export const useMeterReadingStore = create<MeterReadingStore>((set, get) => ({
  readings: [],

  load: () => {
    set({ readings: filterActive(loadFromStorage<MeterReading[]>(STORAGE_KEY, [])) });
  },

  getByMeter: (meterId) =>
    get().readings
      .filter(r => r.meter_id === meterId)
      .sort((a, b) => b.datum.localeCompare(a.datum)),

  getLatest: (meterId) => get().getByMeter(meterId)[0],

  addReading: (meterId, datum, stav, userId, poznamka) => {
    const previous = get().getLatest(meterId);
    const spotreba = previous ? Math.max(0, stav - previous.stav) : undefined;

    const newReading: MeterReading = {
      ...makeEntityBase(),
      meter_id: meterId,
      datum,
      stav,
      spotreba,
      spotreba_od: previous?.datum,
      source: 'manual',
      read_by_user_id: userId,
      poznamka,
    };

    const all = loadFromStorage<MeterReading[]>(STORAGE_KEY, []);
    const updated = [...all, newReading];
    saveToStorage(STORAGE_KEY, updated);
    set({ readings: filterActive(updated) });
    return newReading;
  },

  deleteReading: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<MeterReading[]>(STORAGE_KEY, []);
    const updated = all.map(r =>
      r.id === id ? { ...r, deleted_at: now, updated_at: now } : r
    );
    saveToStorage(STORAGE_KEY, updated);
    set({ readings: filterActive(updated) });
  },
}));
