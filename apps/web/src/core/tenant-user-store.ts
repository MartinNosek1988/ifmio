import { create } from 'zustand';
import type { TenantUser, ModulePermissions, UserRole } from '../shared/schema/user';
import { ROLE_DEFAULT_PERMISSIONS } from '../shared/schema/user';
import { loadFromStorage, saveToStorage, makeEntityBase } from './storage';

const STORAGE_KEY = 'estateos_tenant_users';

interface TenantUserStore {
  tenantUsers: TenantUser[];
  load: () => void;
  getPermissions: (userId: string, tenantId: string) => ModulePermissions | null;
  hasPermission: (userId: string, tenantId: string, module: keyof ModulePermissions, level: 'read' | 'write' | 'admin') => boolean;
  invite: (tenantId: string, userId: string, role: UserRole, invitedByUserId: string) => TenantUser;
  updatePermissions: (tenantUserId: string, permissions: Partial<ModulePermissions>) => void;
  remove: (tenantUserId: string) => void;
}

const LEVEL_ORDER: Record<string, number> = { none: 0, read: 1, write: 2, admin: 3 };

export const useTenantUserStore = create<TenantUserStore>((set, get) => ({
  tenantUsers: [],

  load: () => {
    set({ tenantUsers: loadFromStorage<TenantUser[]>(STORAGE_KEY, []) });
  },

  getPermissions: (userId, tenantId) => {
    const tu = get().tenantUsers.find(
      t => t.user_id === userId && t.tenant_id === tenantId && !t.deleted_at
    );
    if (!tu) return null;
    return { ...ROLE_DEFAULT_PERMISSIONS[tu.role], ...tu.permissions };
  },

  hasPermission: (userId, tenantId, module, level) => {
    const perms = get().getPermissions(userId, tenantId);
    if (!perms) return false;
    return (LEVEL_ORDER[perms[module]] ?? 0) >= (LEVEL_ORDER[level] ?? 0);
  },

  invite: (tenantId, userId, role, invitedByUserId) => {
    const now = new Date().toISOString();
    const newTU: TenantUser = {
      ...makeEntityBase({ tenant_id: tenantId }),
      user_id: userId,
      role,
      permissions: {} as ModulePermissions,
      invited_at: now,
      accepted_at: null,
      invited_by_user_id: invitedByUserId,
    };
    const updated = [...get().tenantUsers, newTU];
    saveToStorage(STORAGE_KEY, updated);
    set({ tenantUsers: updated });
    return newTU;
  },

  updatePermissions: (tenantUserId, permissions) => {
    const updated = get().tenantUsers.map(tu =>
      tu.id === tenantUserId
        ? { ...tu, permissions: { ...tu.permissions, ...permissions }, updated_at: new Date().toISOString() }
        : tu
    );
    saveToStorage(STORAGE_KEY, updated);
    set({ tenantUsers: updated });
  },

  remove: (tenantUserId) => {
    const now = new Date().toISOString();
    const updated = get().tenantUsers.map(tu =>
      tu.id === tenantUserId ? { ...tu, deleted_at: now, updated_at: now } : tu
    );
    saveToStorage(STORAGE_KEY, updated);
    set({ tenantUsers: updated });
  },
}));
