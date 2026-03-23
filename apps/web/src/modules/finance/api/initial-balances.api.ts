import { apiClient } from '../../../core/api/client'

export type InitialBalanceType =
  | 'OWNER_DEBT'
  | 'OWNER_OVERPAYMENT'
  | 'BANK_ACCOUNT'
  | 'FUND_BALANCE'
  | 'DEPOSIT'
  | 'METER_READING'

export interface InitialBalance {
  id: string
  tenantId: string
  propertyId: string
  type: InitialBalanceType
  entityId: string | null
  entityType: string | null
  amount: number
  meterValue: number | null
  cutoverDate: string
  note: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface KontoStatusItem {
  unitId: string
  unitName: string
  residentId: string
  residentName: string
  hasOpeningBalance: boolean
  openingBalanceDate: string | null
  currentBalance: number
}

export interface PropertyInitialBalances {
  ownerBalances: InitialBalance[]
  bankBalances: InitialBalance[]
  fundBalances: InitialBalance[]
  deposits: InitialBalance[]
  meterReadings: InitialBalance[]
  kontoStatus: KontoStatusItem[]
}

export interface BulkOwnerResult {
  processed: number
  skipped: number
  errors: number
  details: Array<{ unitId: string; residentId: string; amount: number; status: string; error?: string }>
}

export const initialBalancesApi = {
  getPropertyInitialBalances: (propertyId: string) =>
    apiClient.get<PropertyInitialBalances>('/initial-balances', { params: { propertyId } }).then(r => r.data),

  setOwnerBalance: (dto: {
    propertyId: string; unitId: string; residentId: string;
    amount: number; cutoverDate: string; note?: string
  }) => apiClient.post('/initial-balances/owner', dto).then(r => r.data),

  bulkSetOwnerBalances: (dto: {
    propertyId: string; cutoverDate: string;
    items: Array<{ unitId: string; residentId: string; amount: number; note?: string }>
  }) => apiClient.post<BulkOwnerResult>('/initial-balances/owner/bulk', dto).then(r => r.data),

  setBankBalance: (dto: {
    propertyId: string; bankAccountId: string;
    amount: number; cutoverDate: string; note?: string
  }) => apiClient.post('/initial-balances/bank', dto).then(r => r.data),

  setFundBalance: (dto: {
    propertyId: string; componentId: string;
    amount: number; cutoverDate: string; note?: string
  }) => apiClient.post('/initial-balances/fund', dto).then(r => r.data),

  setDeposit: (dto: {
    propertyId: string; unitId: string; residentId: string;
    amount: number; cutoverDate: string; note?: string
  }) => apiClient.post('/initial-balances/deposit', dto).then(r => r.data),

  setMeterReading: (dto: {
    propertyId: string; meterId: string;
    value: number; cutoverDate: string; note?: string
  }) => apiClient.post('/initial-balances/meter', dto).then(r => r.data),

  deleteInitialBalance: (id: string) =>
    apiClient.delete(`/initial-balances/${id}`).then(r => r.data),
}
