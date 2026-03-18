import type { UUID } from './common';

export type UserRole = 'tenant_owner' | 'tenant_admin' | 'property_manager' | 'finance_manager' | 'operations' | 'viewer' | 'unit_owner' | 'unit_tenant';
export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface AuthUser {
  id: UUID;
  email: string;
  name: string;
  role: UserRole;
  tenantId: UUID;
}

export interface Tenant {
  id: UUID;
  name: string;
  slug: string;
  plan: TenantPlan;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  tenantName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface JwtPayload {
  sub: UUID;
  tenantId: UUID;
  role: UserRole;
  iat?: number;
  exp?: number;
}
