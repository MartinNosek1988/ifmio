import { create } from 'zustand';
import type { AuditLog, AuditAction } from '../shared/schema/audit';
import { loadFromStorage, saveToStorage, makeEntityBase, getCurrentTenantId } from './storage';

const STORAGE_KEY = 'estateos_audit_log';
const MAX_LOG_ENTRIES = 1000;

interface AuditStore {
  logs: AuditLog[];
  load: () => void;
  log: (
    userId: string | undefined,
    entityType: string,
    entityId: string,
    action: AuditAction,
    changes?: Record<string, { before: unknown; after: unknown }>
  ) => void;
  getByEntity: (entityType: string, entityId: string) => AuditLog[];
  getByUser: (userId: string) => AuditLog[];
  getRecent: (limit?: number) => AuditLog[];
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  logs: [],

  load: () => {
    set({ logs: loadFromStorage<AuditLog[]>(STORAGE_KEY, []) });
  },

  log: (userId, entityType, entityId, action, changes) => {
    const newLog: AuditLog = {
      ...makeEntityBase({ tenant_id: getCurrentTenantId() }),
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      changes,
    };

    const all = loadFromStorage<AuditLog[]>(STORAGE_KEY, []);
    const updated = [...all, newLog].slice(-MAX_LOG_ENTRIES);
    saveToStorage(STORAGE_KEY, updated);
    set({ logs: updated });
  },

  getByEntity: (entityType, entityId) =>
    get().logs
      .filter(l => l.entity_type === entityType && l.entity_id === entityId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),

  getByUser: (userId) =>
    get().logs
      .filter(l => l.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),

  getRecent: (limit = 50) =>
    [...get().logs]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit),
}));
