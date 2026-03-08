import { create } from 'zustand';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';

export type DocTyp = 'smlouva' | 'revize' | 'faktura' | 'pasport' | 'pojisteni' | 'ostatni';

export interface Document {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  nazev: string;
  typ: DocTyp;
  propId?: string | number;
  jednotkaId?: string;
  datum: string;
  velikost?: number;
  popis?: string;
  url?: string;
  tagList?: string[];
}

const DOCS_KEY = 'estateos_documents';

type R = Record<string, unknown>;

function normalize(raw: R): Document {
  return {
    id: String(raw.id || ''),
    tenant_id: String(raw.tenant_id || ''),
    created_at: String(raw.created_at || ''),
    updated_at: String(raw.updated_at || ''),
    deleted_at: (raw.deleted_at as string | null) || null,
    nazev: String(raw.nazev || raw.file_name || ''),
    typ: (raw.typ || raw.kategorie || 'ostatni') as DocTyp,
    propId: raw.propId ?? raw.property_id,
    jednotkaId: raw.jednotkaId != null ? String(raw.jednotkaId) : raw.unit_id != null ? String(raw.unit_id) : undefined,
    datum: String(raw.datum || raw.created_at || ''),
    velikost: raw.velikost != null ? Number(raw.velikost) : raw.file_size != null ? Number(raw.file_size) : undefined,
    popis: raw.popis != null ? String(raw.popis) : undefined,
    url: raw.url != null ? String(raw.url) : raw.file_url != null ? String(raw.file_url) : undefined,
    tagList: Array.isArray(raw.tagList) ? raw.tagList.map(String) : undefined,
  };
}

export function formatVelikost(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface DocumentStore {
  documents: Document[];
  load: () => void;
  getById: (id: string) => Document | undefined;
  getByProp: (propId: string | number) => Document[];
  create: (data: Partial<Document>) => Document;
  update: (id: string, data: Partial<Document>) => void;
  remove: (id: string) => void;
  getStats: () => { celkem: number; smlouvy: number; revize: number; faktury: number };
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],

  load: () => {
    const raw = filterActive(loadFromStorage<R[]>(DOCS_KEY, []));
    set({ documents: raw.map(normalize) });
  },

  getById: (id) => get().documents.find(d => String(d.id) === String(id)),

  getByProp: (propId) => get().documents.filter(d => String(d.propId) === String(propId)),

  create: (data) => {
    const d = normalize({ ...makeEntityBase(), typ: 'ostatni', datum: new Date().toISOString().slice(0, 10), ...data });
    const all = loadFromStorage<R[]>(DOCS_KEY, []);
    saveToStorage(DOCS_KEY, [...all, d]);
    set(s => ({ documents: [...s.documents, d] }));
    return d;
  },

  update: (id, data) => {
    const all = loadFromStorage<R[]>(DOCS_KEY, []);
    const updated = all.map(d => String(d.id) === String(id)
      ? { ...d, ...data, updated_at: new Date().toISOString() } : d);
    saveToStorage(DOCS_KEY, updated);
    set({ documents: filterActive(updated).map(normalize) });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<R[]>(DOCS_KEY, []);
    const updated = all.map(d => String(d.id) === String(id)
      ? { ...d, deleted_at: now, updated_at: now } : d);
    saveToStorage(DOCS_KEY, updated);
    set({ documents: filterActive(updated).map(normalize) });
  },

  getStats: () => {
    const { documents } = get();
    return {
      celkem: documents.length,
      smlouvy: documents.filter(d => d.typ === 'smlouva').length,
      revize: documents.filter(d => d.typ === 'revize').length,
      faktury: documents.filter(d => d.typ === 'faktura').length,
    };
  },
}));
