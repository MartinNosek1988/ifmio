export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'tenant_owner' | 'tenant_admin' | 'property_manager' | 'finance_manager' | 'operations' | 'viewer';
  tenantId: string;
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
