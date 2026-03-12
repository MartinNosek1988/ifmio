import { SetMetadata } from '@nestjs/common';

export type UserRole = 'tenant_owner' | 'tenant_admin' | 'property_manager' | 'finance_manager' | 'operations' | 'viewer';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
