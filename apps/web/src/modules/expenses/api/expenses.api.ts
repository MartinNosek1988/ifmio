import { apiClient } from '../../../core/api/client'

export interface ApiExpense {
  id: string
  number: string
  description: string
  category: string
  vendor?: string
  vendorIco?: string
  amount: number
  vatRate?: number
  vatAmount?: number
  amountTotal: number
  currency: string
  receiptDate: string
  receiptNumber?: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed'
  submittedBy: string
  submittedByName?: string
  aiExtracted: boolean
  aiConfidence?: number
  imageBase64?: string
  mimeType?: string
  reimbursementType: string
  rejectionReason?: string
  propertyId?: string
  workOrderId?: string
  property?: { id: string; name: string }
  createdAt: string
}

export interface ExtractedExpense {
  vendor?: string
  vendorIco?: string
  amount?: number
  vatRate?: number
  vatAmount?: number
  amountTotal?: number
  receiptDate?: string
  receiptNumber?: string
  description?: string
  category?: string
  confidence: number
}

export const expensesApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<ApiExpense[]>('/expenses', { params }).then((r) => r.data),
  stats: () =>
    apiClient
      .get<{
        pending: number
        approved: number
        toReimburse: number
        totalThisMonth: number
      }>('/expenses/stats')
      .then((r) => r.data),
  my: () => apiClient.get<ApiExpense[]>('/expenses/my').then((r) => r.data),
  getById: (id: string) => apiClient.get<ApiExpense>(`/expenses/${id}`).then((r) => r.data),
  create: (data: Partial<ApiExpense>) =>
    apiClient.post<ApiExpense>('/expenses', data).then((r) => r.data),
  update: (id: string, data: Partial<ApiExpense>) =>
    apiClient.put<ApiExpense>(`/expenses/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/expenses/${id}`),
  extract: (data: { imageBase64: string; mimeType: string }) =>
    apiClient.post<ExtractedExpense>('/expenses/extract', data).then((r) => r.data),
  submit: (id: string) => apiClient.post<ApiExpense>(`/expenses/${id}/submit`).then((r) => r.data),
  approve: (id: string) =>
    apiClient.post<ApiExpense>(`/expenses/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason: string) =>
    apiClient.post<ApiExpense>(`/expenses/${id}/reject`, { reason }).then((r) => r.data),
  reimburse: (id: string, data: Record<string, unknown>) =>
    apiClient.post<ApiExpense>(`/expenses/${id}/reimburse`, data).then((r) => r.data),
}
