import { apiClient } from '../../../core/api/client'

export interface ApiPrincipal {
  id: string
  tenantId: string
  partyId: string
  type: string
  code: string | null
  displayName: string
  isActive: boolean
  validFrom: string | null
  validTo: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  party?: {
    id: string
    displayName: string
    type: string
    ic: string | null
    dic: string | null
    email: string | null
    phone: string | null
    street: string | null
    city: string | null
  }
  owners?: any[]
  managementContracts?: any[]
  financialContexts?: any[]
  _count?: { managementContracts: number }
}

export interface ApiPrincipalProperty {
  id: string
  name: string
  address: string
  city: string
  _count?: { units: number; residents: number }
}

export interface ApiPrincipalUnit {
  id: string
  name: string
  floor: number | null
  area: number | null
  spaceType: string
  property: { id: string; name: string }
  tenancies: Array<{ party: { id: string; displayName: string } }>
}

export interface ApiPrincipalTenancy {
  id: string
  type: string
  isActive: boolean
  validFrom: string | null
  validTo: string | null
  rentAmount: number | null
  unit: { id: string; name: string; property: { id: string; name: string } }
  party: { id: string; displayName: string; phone: string | null; email: string | null }
}

export const principalsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<{ data: ApiPrincipal[]; total: number }>('/principals', { params }).then(r => r.data),
  getOne: (id: string) =>
    apiClient.get<ApiPrincipal>(`/principals/${id}`).then(r => r.data),
  getProperties: (id: string) =>
    apiClient.get<ApiPrincipalProperty[]>(`/principals/${id}/properties`).then(r => r.data),
  getUnits: (id: string) =>
    apiClient.get<ApiPrincipalUnit[]>(`/principals/${id}/units`).then(r => r.data),
  getTenants: (id: string) =>
    apiClient.get<ApiPrincipalTenancy[]>(`/principals/${id}/tenants`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiPrincipal>('/principals', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch<ApiPrincipal>(`/principals/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/principals/${id}`).then(r => r.data),
}
