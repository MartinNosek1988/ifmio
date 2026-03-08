import { create } from 'zustand';
import type { Person, PersonRole } from '../../shared/schema/person';
import { getPersonDisplayName } from '../../shared/schema/person';
import { loadFromStorage, saveToStorage, makeEntityBase, filterActive } from '../../core/storage';

const STORAGE_KEY = 'estateos_persons';

interface PersonStore {
  persons: Person[];
  load: () => void;
  getById: (id: string) => Person | undefined;
  getByRole: (role: PersonRole) => Person[];
  search: (query: string) => Person[];
  create: (data: Partial<Person>) => Person;
  update: (id: string, data: Partial<Person>) => void;
  remove: (id: string) => void;
}

export const usePersonStore = create<PersonStore>((set, get) => ({
  persons: [],

  load: () => {
    set({ persons: filterActive(loadFromStorage<Person[]>(STORAGE_KEY, [])) });
  },

  getById: (id) => get().persons.find(p => p.id === id),

  getByRole: (role) => get().persons.filter(p => p.roles.includes(role)),

  search: (query) => {
    const q = query.toLowerCase();
    return get().persons.filter(p =>
      p.display_name.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.ico?.includes(q) ||
      p.telefon?.includes(q)
    );
  },

  create: (data) => {
    const newPerson: Person = {
      ...makeEntityBase(),
      type: 'fyzicka',
      roles: [],
      display_name: '',
      ...data,
    } as Person;
    newPerson.display_name = getPersonDisplayName(newPerson);

    const all = loadFromStorage<Person[]>(STORAGE_KEY, []);
    const updated = [...all, newPerson];
    saveToStorage(STORAGE_KEY, updated);
    set({ persons: filterActive(updated) });
    return newPerson;
  },

  update: (id, data) => {
    const all = loadFromStorage<Person[]>(STORAGE_KEY, []);
    const updated = all.map(p =>
      p.id === id
        ? { ...p, ...data, display_name: getPersonDisplayName({ ...p, ...data }), updated_at: new Date().toISOString() }
        : p
    );
    saveToStorage(STORAGE_KEY, updated);
    set({ persons: filterActive(updated) });
  },

  remove: (id) => {
    const now = new Date().toISOString();
    const all = loadFromStorage<Person[]>(STORAGE_KEY, []);
    const updated = all.map(p =>
      p.id === id ? { ...p, deleted_at: now, updated_at: now } : p
    );
    saveToStorage(STORAGE_KEY, updated);
    set({ persons: filterActive(updated) });
  },
}));
