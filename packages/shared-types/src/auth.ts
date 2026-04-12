import type { UUID } from './common';

export type UserRole = 'tenant_owner' | 'tenant_admin' | 'property_manager' | 'finance_manager' | 'operations' | 'viewer' | 'unit_owner' | 'unit_tenant' | 'supplier';

export type TenantSubjectType =
  | 'svj_bd'
  | 'spravce'
  | 'vlastnik_domu'
  | 'vlastnik_jednotky'
  | 'najemnik'
  | 'dodavatel';

export type SupplierCategory =
  | 'instalater'
  | 'elektrikar'
  | 'zamecnik'
  | 'malir_naterac'
  | 'podlahar'
  | 'zednicke_prace'
  | 'pokryvac'
  | 'zahradnik'
  | 'uklid'
  | 'pest_control'
  | 'revizni_technik'
  | 'ucetni'
  | 'pravnik'
  | 'projekce'
  | 'vymahani'
  | 'sprava_nemovitosti'
  | 'zatepleni'
  | 'vytahy'
  | 'pozarni_ochrana'
  | 'jine';
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
