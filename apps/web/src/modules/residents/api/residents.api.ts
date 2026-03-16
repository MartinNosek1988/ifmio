import { apiClient } from '../../../core/api/client';

export interface ApiResident {
  id: string;
  tenantId: string;
  propertyId?: string;
  unitId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  hasDebt: boolean;
  isLegalEntity?: boolean;
  ico?: string | null;
  dic?: string | null;
  companyName?: string | null;
  correspondenceAddress?: string | null;
  correspondenceCity?: string | null;
  correspondencePostalCode?: string | null;
  dataBoxId?: string | null;
  birthDate?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; name: string };
  unit?: { id: string; name: string };
}

export interface PaginatedResidents {
  data: ApiResident[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateResidentPayload {
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
  phone?: string;
  propertyId?: string;
  unitId?: string;
  isLegalEntity?: boolean;
  ico?: string | null;
  dic?: string | null;
  companyName?: string | null;
  correspondenceAddress?: string | null;
  correspondenceCity?: string | null;
  correspondencePostalCode?: string | null;
  dataBoxId?: string | null;
  birthDate?: string | null;
  note?: string | null;
}

export const residentsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResidents>('/residents', { params }).then((r) => r.data),

  debtors: () =>
    apiClient.get<ApiResident[]>('/residents/debtors').then((r) => r.data),

  detail: (id: string) =>
    apiClient.get<ApiResident>(`/residents/${id}`).then((r) => r.data),

  create: (dto: CreateResidentPayload) =>
    apiClient.post<ApiResident>('/residents', dto).then((r) => r.data),

  update: (id: string, dto: Partial<CreateResidentPayload>) =>
    apiClient.put<ApiResident>(`/residents/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/residents/${id}`),

  invoices: (id: string) =>
    apiClient.get<any[]>(`/residents/${id}/invoices`).then((r) => r.data),

  aresLookup: (ico: string) =>
    apiClient.get<{ ico: string; nazev: string; dic?: string; adresa: { ulice: string; obec: string; psc: string } } | null>(
      `/integrations/ares/ico`, { params: { ico } }
    ).then((r) => r.data),

  bulkDeactivate: (ids: string[]) =>
    apiClient.post<{ affected: number }>('/residents/bulk/deactivate', { ids }).then((r) => r.data),

  bulkActivate: (ids: string[]) =>
    apiClient.post<{ affected: number }>('/residents/bulk/activate', { ids }).then((r) => r.data),

  bulkAssignProperty: (ids: string[], propertyId: string) =>
    apiClient.post<{ affected: number }>('/residents/bulk/assign-property', { ids, propertyId }).then((r) => r.data),

  bulkMarkDebtors: (ids: string[], hasDebt: boolean) =>
    apiClient.post<{ affected: number }>('/residents/bulk/mark-debtors', { ids, hasDebt }).then((r) => r.data),
};
