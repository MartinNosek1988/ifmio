import type { UserRole } from '../decorators/roles.decorator';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  tenant_owner: 50,
  tenant_admin: 40,
  finance_manager: 35,
  property_manager: 30,
  operations: 20,
  viewer: 10,
};

/** Roles that can write (create/update) general entities */
export const ROLES_WRITE: UserRole[] = ['tenant_owner', 'tenant_admin', 'property_manager'];

/** Roles that can manage (delete/archive, user management) */
export const ROLES_MANAGE: UserRole[] = ['tenant_owner', 'tenant_admin'];

/** Roles with finance write access (create/update invoices, bank accounts, prescriptions, reminders) */
export const ROLES_FINANCE: UserRole[] = ['tenant_owner', 'tenant_admin', 'finance_manager'];

/** Roles with finance + property_manager draft access (create/update invoices, but NOT mark paid / approve) */
export const ROLES_FINANCE_DRAFT: UserRole[] = ['tenant_owner', 'tenant_admin', 'property_manager', 'finance_manager'];

/** Roles with operations write access (helpdesk, work orders, meters, calendar) */
export const ROLES_OPS: UserRole[] = ['tenant_owner', 'tenant_admin', 'property_manager', 'operations'];

/** Legacy compatibility map: old role name → new role name */
export const ROLE_MIGRATION_MAP: Record<string, UserRole> = {
  owner: 'tenant_owner',
  admin: 'tenant_admin',
  manager: 'property_manager',
  technician: 'operations',
  viewer: 'viewer',
};
