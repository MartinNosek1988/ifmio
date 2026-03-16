import { apiClient } from '../../../core/api/client'

export interface OwnerAccountSummary {
  id: string
  propertyId: string
  unitId: string
  residentId: string
  currentBalance: number
  lastPostingAt: string | null
  resident: {
    id: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
    isLegalEntity: boolean
  }
  unit: {
    id: string
    name: string
    knDesignation: string | null
  }
}

export interface LedgerEntryRow {
  id: string
  type: 'DEBIT' | 'CREDIT' | 'ADJUSTMENT'
  amount: number
  balance: number
  sourceType: string
  sourceId: string
  description: string | null
  postingDate: string
}

export interface LedgerPage {
  entries: LedgerEntryRow[]
  total: number
  currentBalance: number
}

export const kontoApi = {
  getPropertyAccounts: (propertyId: string) =>
    apiClient.get<OwnerAccountSummary[]>(`/konto/property/${propertyId}`).then(r => r.data),

  getAccountDetail: (accountId: string) =>
    apiClient.get<OwnerAccountSummary & { property: { id: string; name: string } }>(`/konto/account/${accountId}`).then(r => r.data),

  getAccountLedger: (accountId: string, page = 1, pageSize = 20) =>
    apiClient.get<LedgerPage>(`/konto/account/${accountId}/entries`, { params: { page, pageSize } }).then(r => r.data),

  getAccountByResident: (residentId: string, unitId: string) =>
    apiClient.get<OwnerAccountSummary | null>(`/konto/resident/${residentId}/unit/${unitId}`).then(r => r.data),

  postManualAdjustment: (accountId: string, data: { amount: number; type: 'DEBIT' | 'CREDIT'; description: string; date?: string }) =>
    apiClient.post<LedgerEntryRow>(`/konto/account/${accountId}/adjust`, data).then(r => r.data),

  recalculateBalance: (accountId: string) =>
    apiClient.post(`/konto/recalculate/${accountId}`).then(r => r.data),

  applyOffset: (data: { sourceAccountId: string; targetAccountId: string; amount: number; description?: string }) =>
    apiClient.post(`/konto/offset`, data).then(r => r.data),
}
