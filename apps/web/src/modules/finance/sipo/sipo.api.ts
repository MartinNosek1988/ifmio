import { apiClient } from '../../../core/api/client'

export interface SipoConfigData {
  id: string
  propertyId: string
  recipientNumber: string
  feeCode: string
  deliveryMode: 'FULL_REGISTER' | 'CHANGES_ONLY'
  encoding: 'CP852' | 'WIN1250'
  isActive: boolean
}

export interface SipoPreviewItem {
  unitName: string
  residentName: string
  sipoNumber: string | null
  amount: number
  warnings: string[]
}

export interface SipoPreview {
  totalPayers: number
  validPayers: number
  totalAmount: number
  items: SipoPreviewItem[]
  config: { recipientNumber: string; feeCode: string }
}

export interface SipoExportRecord {
  id: string
  period: string
  recordCount: number
  totalAmount: number
  fileName: string
  status: string
  createdAt: string
}

export interface SipoPayer {
  id: string
  unitId: string
  residentId: string
  sipoNumber: string | null
  unit: { id: string; name: string }
  resident: { id: string; firstName: string; lastName: string }
}

export const sipoApi = {
  getConfig: (propertyId: string) =>
    apiClient.get<SipoConfigData | null>(`/sipo/config/${propertyId}`).then(r => r.data),
  createConfig: (dto: { propertyId: string; recipientNumber: string; feeCode: string; deliveryMode?: string; encoding?: string }) =>
    apiClient.post<SipoConfigData>('/sipo/config', dto).then(r => r.data),
  updateConfig: (id: string, dto: Record<string, unknown>) =>
    apiClient.put<SipoConfigData>(`/sipo/config/${id}`, dto).then(r => r.data),
  preview: (propertyId: string, period: string) =>
    apiClient.get<SipoPreview>(`/sipo/export/preview/${propertyId}`, { params: { period } }).then(r => r.data),
  generate: (propertyId: string, period: string) =>
    apiClient.post(`/sipo/export/generate/${propertyId}`, { period }).then(r => r.data),
  history: (propertyId: string) =>
    apiClient.get<SipoExportRecord[]>(`/sipo/export/history/${propertyId}`).then(r => r.data),
  importPayments: (propertyId: string, file: File) => {
    const form = new FormData(); form.append('file', file)
    return apiClient.post(`/sipo/import/payments/${propertyId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  importErrors: (propertyId: string, file: File) => {
    const form = new FormData(); form.append('file', file)
    return apiClient.post(`/sipo/import/errors/${propertyId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  getPayers: (propertyId: string) =>
    apiClient.get<SipoPayer[]>(`/sipo/payers/${propertyId}`).then(r => r.data),
  updatePayer: (occupancyId: string, sipoNumber: string) =>
    apiClient.put(`/sipo/payers/${occupancyId}`, { sipoNumber }).then(r => r.data),
}
