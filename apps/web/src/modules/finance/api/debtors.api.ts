import { apiClient } from '../../../core/api/client'

export interface DebtorSummary {
  accountId: string
  residentId: string
  residentName: string
  isLegalEntity: boolean
  unitId: string
  unitName: string
  totalDebt: number
  oldestDebtDate: string
  daysOverdue: number
  agingBucket: string
  lastPaymentDate: string | null
  reminderCount: number
  lastReminderDate: string | null
}

export interface DebtorStats {
  totalDebtors: number
  totalDebtAmount: number
  totalOverpayments: number
  netPosition: number
  agingBreakdown: Record<string, number>
  averageDebtAge: number
}

export interface AgingDetail {
  openDebits: Array<{
    entryId: string
    sourceId: string
    originalAmount: number
    remainingAmount: number
    postingDate: string
    daysOverdue: number
  }>
  buckets: Record<string, number>
  oldestDebtDate: string | null
  totalOverdue: number
}

export const debtorsApi = {
  getPropertyDebtors: (propertyId: string, params?: { minAmount?: number; sortBy?: string }) =>
    apiClient.get<DebtorSummary[]>(`/debtors/property/${propertyId}`, { params }).then(r => r.data),

  getDebtorStats: (propertyId: string) =>
    apiClient.get<DebtorStats>(`/debtors/property/${propertyId}/stats`).then(r => r.data),

  getAccountAging: (accountId: string) =>
    apiClient.get<AgingDetail>(`/debtors/account/${accountId}/aging`).then(r => r.data),
}
