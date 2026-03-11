import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';

export type AssetStav = 'aktivni' | 'servis' | 'vyrazeno' | 'neaktivni';
export type AssetStavRevize = 'ok' | 'blizi_se' | 'prosla';

export interface Asset {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  nazev: string;
  typNazev?: string;
  vyrobce?: string;
  model?: string;
  umisteni?: string;
  propertyId?: string | number;
  jednotkaId?: string;
  stav: AssetStav;
  stavRevize: AssetStavRevize;
  posledniRevize?: string;
  pristiRevize?: string;
  datumPorizeni?: string;
  hodnotaPorizeni?: number;
  poznamka?: string;
}

const ASSETS_KEY = 'estateos_assets';

type R = Record<string, unknown>;

function normalize(raw: R): Asset {
  return {
    id: String(raw.id || ''),
    tenant_id: String(raw.tenant_id || ''),
    created_at: String(raw.created_at || ''),
    updated_at: String(raw.updated_at || ''),
    deleted_at: (raw.deleted_at as string | null) || null,
    nazev: String(raw.nazev || ''),
    typNazev: raw.typNazev != null ? String(raw.typNazev) : raw.category_id != null ? String(raw.category_id) : undefined,
    vyrobce: raw.vyrobce != null ? String(raw.vyrobce) : undefined,
    model: raw.model != null ? String(raw.model) : undefined,
    umisteni: raw.umisteni != null ? String(raw.umisteni) : undefined,
    propertyId: (raw.propertyId ?? raw.property_id) as string | number | undefined,
    jednotkaId: raw.jednotkaId != null ? String(raw.jednotkaId) : raw.unit_id != null ? String(raw.unit_id) : undefined,
    stav: (raw.stav || raw.status || 'aktivni') as AssetStav,
    stavRevize: (raw.stavRevize || 'ok') as AssetStavRevize,
    posledniRevize: raw.posledniRevize != null ? String(raw.posledniRevize) : raw.posledni_revize != null ? String(raw.posledni_revize) : undefined,
    pristiRevize: raw.pristiRevize != null ? String(raw.pristiRevize) : raw.datum_pristi_revize != null ? String(raw.datum_pristi_revize) : undefined,
    datumPorizeni: raw.datumPorizeni != null ? String(raw.datumPorizeni) : raw.datum_porideni != null ? String(raw.datum_porideni) : undefined,
    hodnotaPorizeni: raw.hodnotaPorizeni != null ? Number(raw.hodnotaPorizeni) : raw.hodnota_kc != null ? Number(raw.hodnota_kc) : undefined,
    poznamka: raw.poznamka != null ? String(raw.poznamka) : undefined,
  };
}

export function daysToRevize(pristiRevize?: string): number | null {
  if (!pristiRevize) return null;
  return Math.ceil((new Date(pristiRevize).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface AssetStore {
  assets: Asset[];
  load: () => void;
  getById: (id: string) => Asset | undefined;
  create: (data: Partial<Asset>) => Asset;
  update: (id: string, data: Partial<Asset>) => void;
  changeStav: (id: string, stav: AssetStav) => void;
  remove: (id: string) => void;
  getStats: () => { celkem: number; aktivnich: number; poRevizi: number; vServisu: number };
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],

  load: () => {
    const raw = filterActive(loadFromStorage<R[]>(ASSETS_KEY, []));
    set({ assets: raw.map(normalize) });
  },

  getById: (id) => get().assets.find(a => String(a.id) === String(id)),

  create: (data) => {
    const a = normalize({
      ...makeEntityBase(),
      stav: 'aktivni',
      stavRevize: 'ok',
      ...data,
    });
    const all = loadFromStorage<R[]>(ASSETS_KEY, []);
    saveToStorage(ASSETS_KEY, [...all, a]);
    set(s => ({ assets: [...s.assets, a] }));
    return a;
  },

  update: (id, data) => {
    const all = loadFromStorage<R[]>(ASSETS_KEY, []);
    const updated = all.map(a => String(a.id) === String(id)
      ? { ...a, ...data, updated_at: new Date().toISOString() } : a);
    saveToStorage(ASSETS_KEY, updated);
    set({ assets: filterActive(updated).map(normalize) });
  },

  changeStav: (id, stav) => {
    get().update(id, { stav });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<R[]>(ASSETS_KEY, []);
    const updated = all.map(a => String(a.id) === String(id)
      ? { ...a, deleted_at: now, updated_at: now } : a);
    saveToStorage(ASSETS_KEY, updated);
    set({ assets: filterActive(updated).map(normalize) });
  },

  getStats: () => {
    const { assets } = get();
    return {
      celkem: assets.length,
      aktivnich: assets.filter(a => a.stav === 'aktivni').length,
      poRevizi: assets.filter(a => a.stavRevize === 'prosla').length,
      vServisu: assets.filter(a => a.stav === 'servis').length,
    };
  },
}));
