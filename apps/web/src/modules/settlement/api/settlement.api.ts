import { apiClient } from '../../../core/api/client'

export interface ApiSettlement {
  id: string
  tenantId: string
  propertyId: string
  name: string
  periodFrom: string
  periodTo: string
  status: string
  totalHeatingCost: number | null
  totalHotWaterCost: number | null
  heatingBasicPercent: number
  hotWaterBasicPercent: number
  buildingEnergyClass: string | null
  totalHeatedArea: number | null
  calculatedAt: string | null
  approvedAt: string | null
  note: string | null
  createdAt: string
  property?: { id: string; name: string; address?: string; city?: string }
  costEntries?: ApiSettlementCost[]
  items?: ApiSettlementItem[]
  _count?: { items: number; costEntries: number }
}

export interface ApiSettlementCost {
  id: string
  settlementId: string
  costType: string
  name: string
  totalAmount: number
  distributionKey: string
  basicPercent: number | null
  invoiceId: string | null
}

export interface ApiSettlementItem {
  id: string
  settlementId: string
  unitId: string
  heatingBasic: number
  heatingConsumption: number
  heatingTotal: number
  heatingCorrected: number
  hotWaterBasic: number
  hotWaterConsumption: number
  hotWaterTotal: number
  otherCosts: number
  totalCost: number
  totalAdvances: number
  balance: number
  heatedArea: number | null
  personCount: number | null
  meterReading: number | null
  waterReading: number | null
  costBreakdown: Array<{ costType: string; amount: number; key: string }> | null
  unit?: { id: string; name: string; floor: number | null; area: number | null }
}

export const settlementApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<ApiSettlement[]>('/settlements', { params }).then(r => r.data),
  getOne: (id: string) =>
    apiClient.get<ApiSettlement>(`/settlements/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiSettlement>('/settlements', data).then(r => r.data),
  addCost: (id: string, data: Record<string, unknown>) =>
    apiClient.post<ApiSettlementCost>(`/settlements/${id}/costs`, data).then(r => r.data),
  removeCost: (costId: string) =>
    apiClient.delete(`/settlements/costs/${costId}`),
  calculate: (id: string) =>
    apiClient.post<ApiSettlement>(`/settlements/${id}/calculate`).then(r => r.data),
  approve: (id: string) =>
    apiClient.post<ApiSettlement>(`/settlements/${id}/approve`).then(r => r.data),
  getUnitDetail: (id: string, unitId: string) =>
    apiClient.get<ApiSettlementItem>(`/settlements/${id}/units/${unitId}`).then(r => r.data),
}
