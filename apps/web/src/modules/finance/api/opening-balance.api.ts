import { apiClient } from '../../../core/api/client'

export interface OpeningBalanceStatus {
  unitId: string
  unitName: string
  residentId: string | null
  residentName: string | null
  hasOpeningBalance: boolean
  openingBalanceDate: string | null
  currentBalance: number
}

export interface BulkOpeningBalanceResult {
  set: number
  skipped: number
  errors: number
  details: Array<{ unitId: string; residentId: string; amount: number; status: string; error?: string }>
}

export const openingBalanceApi = {
  getStatus: (propertyId: string) =>
    apiClient.get<OpeningBalanceStatus[]>(`/konto/opening-balance/status/${propertyId}`).then(r => r.data),

  setSingle: (data: { propertyId: string; unitId: string; residentId: string; amount: number; cutoverDate: string; note?: string }) =>
    apiClient.post('/konto/opening-balance', data).then(r => r.data),

  setBulk: (data: { propertyId: string; cutoverDate: string; balances: Array<{ unitId: string; residentId: string; amount: number; note?: string }> }) =>
    apiClient.post<BulkOpeningBalanceResult>('/konto/opening-balance/bulk', data).then(r => r.data),
}
