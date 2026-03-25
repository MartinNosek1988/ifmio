import { apiClient } from '../../../core/api/client'

export interface ApiEvidenceFolder {
  id: string
  tenantId: string
  propertyId: string
  name: string
  code: string | null
  description: string | null
  color: string | null
  sortOrder: number
  isActive: boolean
  totalAllocated: number
  _count?: { allocations: number }
}

export interface ApiEvidenceAllocation {
  id: string
  evidenceFolderId: string
  invoiceId: string
  amount: number
  year: number | null
  periodFrom: string | null
  periodTo: string | null
  note: string | null
  createdAt: string
  evidenceFolder: { id: string; name: string; color: string | null }
}

export const evidenceFoldersApi = {
  list: (propertyId: string) =>
    apiClient.get<ApiEvidenceFolder[]>('/finance/evidence-folders', { params: { propertyId } }).then(r => r.data),
  create: (dto: Record<string, unknown>) =>
    apiClient.post<ApiEvidenceFolder>('/finance/evidence-folders', dto).then(r => r.data),
  update: (id: string, dto: Record<string, unknown>) =>
    apiClient.put<ApiEvidenceFolder>(`/finance/evidence-folders/${id}`, dto).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/finance/evidence-folders/${id}`).then(r => r.data),

  // Invoice allocations
  listAllocations: (invoiceId: string) =>
    apiClient.get<ApiEvidenceAllocation[]>(`/finance/invoices/${invoiceId}/evidence-allocations`).then(r => r.data),
  createAllocation: (invoiceId: string, dto: Record<string, unknown>) =>
    apiClient.post<ApiEvidenceAllocation>(`/finance/invoices/${invoiceId}/evidence-allocations`, dto).then(r => r.data),
  updateAllocation: (invoiceId: string, allocationId: string, dto: Record<string, unknown>) =>
    apiClient.put<ApiEvidenceAllocation>(`/finance/invoices/${invoiceId}/evidence-allocations/${allocationId}`, dto).then(r => r.data),
  deleteAllocation: (invoiceId: string, allocationId: string) =>
    apiClient.delete(`/finance/invoices/${invoiceId}/evidence-allocations/${allocationId}`).then(r => r.data),
}
