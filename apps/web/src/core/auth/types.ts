export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'tenant_owner' | 'tenant_admin' | 'property_manager' | 'finance_manager' | 'operations' | 'viewer' | 'unit_owner' | 'unit_tenant';
  tenantId: string;
  partyId?: string | null;
  language?: string;
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
