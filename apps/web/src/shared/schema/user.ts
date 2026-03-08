import type { BaseEntity } from './base';

export type UserRole = 'owner' | 'admin' | 'manager' | 'viewer' | 'resident';

export interface User extends BaseEntity {
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  last_login_at?: string;
}

export interface TenantUser extends BaseEntity {
  user_id: string;
  role: UserRole;
  permissions: ModulePermissions;
  invited_at: string;
  accepted_at?: string | null;
  invited_by_user_id?: string;
}

export type PermissionLevel = 'none' | 'read' | 'write' | 'admin';

export interface ModulePermissions {
  dashboard: PermissionLevel;
  properties: PermissionLevel;
  residents: PermissionLevel;
  finance: PermissionLevel;
  work_orders: PermissionLevel;
  helpdesk: PermissionLevel;
  assets: PermissionLevel;
  meters: PermissionLevel;
  documents: PermissionLevel;
  contracts: PermissionLevel;
  compliance: PermissionLevel;
  reporting: PermissionLevel;
  admin: PermissionLevel;
}

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, ModulePermissions> = {
  owner: {
    dashboard: 'admin', properties: 'admin', residents: 'admin', finance: 'admin',
    work_orders: 'admin', helpdesk: 'admin', assets: 'admin', meters: 'admin',
    documents: 'admin', contracts: 'admin', compliance: 'admin', reporting: 'admin', admin: 'admin',
  },
  admin: {
    dashboard: 'write', properties: 'write', residents: 'write', finance: 'write',
    work_orders: 'write', helpdesk: 'write', assets: 'write', meters: 'write',
    documents: 'write', contracts: 'write', compliance: 'write', reporting: 'write', admin: 'write',
  },
  manager: {
    dashboard: 'write', properties: 'write', residents: 'write', finance: 'read',
    work_orders: 'write', helpdesk: 'write', assets: 'write', meters: 'write',
    documents: 'write', contracts: 'read', compliance: 'read', reporting: 'read', admin: 'none',
  },
  viewer: {
    dashboard: 'read', properties: 'read', residents: 'read', finance: 'none',
    work_orders: 'read', helpdesk: 'read', assets: 'read', meters: 'read',
    documents: 'read', contracts: 'none', compliance: 'read', reporting: 'read', admin: 'none',
  },
  resident: {
    dashboard: 'read', properties: 'none', residents: 'none', finance: 'none',
    work_orders: 'none', helpdesk: 'write', assets: 'none', meters: 'none',
    documents: 'none', contracts: 'read', compliance: 'none', reporting: 'none', admin: 'none',
  },
};
