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
    apiClient.get('/expenses', { params }).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : (d.items ?? d)
    }) as Promise<ApiExpense[]>,
  stats: () =>
    apiClient.get('/expenses/stats').then((r) => {
      const s = r.data
      return {
        pending: s.submitted ?? s.pending ?? 0,
        approved: s.approved ?? 0,
        toReimburse: Math.max((s.approved ?? 0) - (s.reimbursed ?? 0), 0),
        totalThisMonth: (s.draft ?? 0) + (s.submitted ?? 0) + (s.approved ?? 0) + (s.rejected ?? 0) + (s.reimbursed ?? 0),
      }
    }),
  my: () =>
    apiClient.get('/expenses/my').then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : (d.items ?? d)
    }) as Promise<ApiExpense[]>,
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
