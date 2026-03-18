import { apiClient } from '../../../core/api/client'

export interface ApiParty {
  id: string
  tenantId: string
  type: string
  displayName: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  ic: string | null
  dic: string | null
  vatId: string | null
  email: string | null
  phone: string | null
  website: string | null
  street: string | null
  street2: string | null
  city: string | null
  postalCode: string | null
  countryCode: string | null
  dataBoxId: string | null
  bankAccount: string | null
  bankCode: string | null
  iban: string | null
  isActive: boolean
  note: string | null
  pravniForma: string | null
  pravniFormaKod: string | null
  datumVzniku: string | null
  datumZaniku: string | null
  czNace: string[] | null
  zastupci: Array<{ jmeno?: string; prijmeni?: string; funkce?: string }> | null
  isDefunct?: boolean
  createdAt: string
  updatedAt: string
  principals?: Array<{ id: string; displayName: string; type: string; _count?: { managementContracts: number } }>
  _count?: { principals: number }
}

export const partiesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<{ data: ApiParty[]; total: number }>('/parties', { params }).then(r => r.data),
  search: (q: string) =>
    apiClient.get<Array<{ id: string; displayName: string; type: string; ic: string | null; email: string | null }>>('/parties/search', { params: { q } }).then(r => r.data),
  getOne: (id: string) =>
    apiClient.get<ApiParty>(`/parties/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiParty>('/parties', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch<ApiParty>(`/parties/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/parties/${id}`),
}
