import { apiClient } from '../../../core/api/client'

export interface ESignRequest {
  id: string
  documentType: string
  documentId: string
  documentTitle: string
  message?: string
  status: string
  expiresAt: string
  createdAt: string
  signatories: ESignSignatory[]
}

export interface ESignSignatory {
  id: string
  name: string
  email: string
  role?: string
  order: number
  status: string
  signedAt?: string
}

export const esignApi = {
  list: (params?: { status?: string; documentType?: string; documentId?: string }) =>
    apiClient.get<ESignRequest[]>('/esign', { params }).then(r => r.data),
  getById: (id: string) =>
    apiClient.get<ESignRequest>(`/esign/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post<ESignRequest>('/esign', data).then(r => r.data),
  send: (id: string) =>
    apiClient.post(`/esign/${id}/send`).then(r => r.data),
}
