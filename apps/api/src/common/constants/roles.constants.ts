import type { UserRole } from '../decorators/roles.decorator';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 50,
  admin: 40,
  manager: 30,
  technician: 20,
  viewer: 10,
};

/** Roles that can write (create/update) */
export const ROLES_WRITE: UserRole[] = ['owner', 'admin', 'manager'];

/** Roles that can manage (delete/archive) */
export const ROLES_MANAGE: UserRole[] = ['owner', 'admin'];
