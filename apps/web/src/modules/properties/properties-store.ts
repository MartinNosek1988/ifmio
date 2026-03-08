import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';
import type { Property } from '../../shared/schema/property';
import type { Unit } from '../../shared/schema/unit';

const PROPS_KEY = 'estateos_properties';
const UNITS_KEY = 'estateos_units';

interface PropertiesStore {
  properties: Property[];
  units: Unit[];

  load: () => void;

  // Properties CRUD
  getById: (id: string) => Property | undefined;
  create: (data: Partial<Property>) => Property;
  update: (id: string, data: Partial<Property>) => void;
  remove: (id: string) => void;

  // Units CRUD
  getUnitsByProperty: (propertyId: string) => Unit[];
  getUnitById: (id: string) => Unit | undefined;
  createUnit: (propertyId: string, data: Partial<Unit>) => Unit;
  updateUnit: (id: string, data: Partial<Unit>) => void;
  deleteUnit: (id: string) => void;

  // Stats
  getPropertyStats: (propertyId: string) => {
    total: number;
    obsazeno: number;
    volne: number;
    mesicniPrijem: number;
  };
}

export const usePropertiesStore = create<PropertiesStore>((set, get) => ({
  properties: [],
  units: [],

  load: () => {
    // Normalize legacy property fields: adresa→ulice, typ→type
    const rawProps = filterActive(loadFromStorage<Record<string, unknown>[]>(PROPS_KEY, []));
    const props = rawProps.map(p => ({
      ...p,
      nazev: p.nazev || p.name || '',
      type: p.type || p.typ || 'SVJ',
      ulice: p.ulice || p.adresa || '',
      mesto: p.mesto || p.city || '',
    })) as unknown as Property[];
    // Normalize legacy unit fields: typ→type, plocha→podlahova_plocha, najemne→rent, obsazeno→obsazena, volne→volna
    const rawUnits = filterActive(loadFromStorage<Record<string, unknown>[]>(UNITS_KEY, []));
    const units = rawUnits.map(u => {
      const statusMap: Record<string, string> = { obsazeno: 'obsazena', volne: 'volna' };
      return {
        ...u,
        type: u.type || u.typ || 'byt',
        podlahova_plocha: u.podlahova_plocha ?? u.plocha ?? 0,
        status: statusMap[u.status as string] || u.status || 'volna',
        rent: u.rent ?? u.najemne ?? 0,
        plochy: u.plochy || [],
        vybaveni: u.vybaveni || [],
      } as unknown as Unit;
    });
    set({ properties: props, units });
  },

  getById: (id) => get().properties.find(p => String(p.id) === String(id)),

  create: (data) => {
    const newProp = {
      ...makeEntityBase(),
      nazev: '',
      type: 'SVJ' as const,
      ulice: '',
      mesto: '',
      stat: 'CZ',
      vat_payer: false,
      mena: 'CZK' as const,
      prostredi: 'CZ' as const,
      splatnost_den: 15,
      zaokrouhleni: 'zadne' as const,
      auto_generovani: false,
      zahrnout_nulove: false,
      ...data,
    } as Property;
    const all = loadFromStorage<Property[]>(PROPS_KEY, []);
    saveToStorage(PROPS_KEY, [...all, newProp]);
    set(s => ({ properties: [...s.properties, newProp] }));
    return newProp;
  },

  update: (id, data) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<Property[]>(PROPS_KEY, []);
    const updated = all.map(p =>
      String(p.id) === String(id) ? { ...p, ...data, updated_at: now } : p
    );
    saveToStorage(PROPS_KEY, updated);
    set({ properties: filterActive(updated) });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<Property[]>(PROPS_KEY, []);
    const updated = all.map(p =>
      String(p.id) === String(id) ? { ...p, deleted_at: now, updated_at: now } : p
    );
    saveToStorage(PROPS_KEY, updated);
    set({ properties: filterActive(updated) });
  },

  getUnitsByProperty: (propertyId) =>
    get().units.filter(u => String(u.property_id) === String(propertyId)),

  getUnitById: (id) => get().units.find(u => String(u.id) === String(id)),

  createUnit: (propertyId, data) => {
    const newUnit = {
      ...makeEntityBase(),
      property_id: propertyId,
      cislo: '',
      type: 'byt' as const,
      status: 'volna' as const,
      podlahova_plocha: 0,
      plochy: [],
      vybaveni: [],
      ...data,
    } as Unit;
    const all = loadFromStorage<Unit[]>(UNITS_KEY, []);
    saveToStorage(UNITS_KEY, [...all, newUnit]);
    set(s => ({ units: [...s.units, newUnit] }));
    return newUnit;
  },

  updateUnit: (id, data) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<Unit[]>(UNITS_KEY, []);
    const updated = all.map(u =>
      String(u.id) === String(id) ? { ...u, ...data, updated_at: now } : u
    );
    saveToStorage(UNITS_KEY, updated);
    set({ units: filterActive(updated) });
  },

  deleteUnit: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<Unit[]>(UNITS_KEY, []);
    const updated = all.map(u =>
      String(u.id) === String(id) ? { ...u, deleted_at: now, updated_at: now } : u
    );
    saveToStorage(UNITS_KEY, updated);
    set({ units: filterActive(updated) });
  },

  getPropertyStats: (propertyId) => {
    const units = get().getUnitsByProperty(propertyId);
    const obsazeno = units.filter(u => u.status === 'obsazena').length;
    const mesicniPrijem = units.reduce(
      (sum, u) => sum + ((u as unknown as Record<string, unknown>).rent as number || 0), 0
    );
    return { total: units.length, obsazeno, volne: units.length - obsazeno, mesicniPrijem };
  },
}));
