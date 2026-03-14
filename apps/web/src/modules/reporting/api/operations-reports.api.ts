import { apiClient } from '../../../core/api/client'

export interface OperationalReportFilters {
  propertyId?: string
  dateFrom?: string
  dateTo?: string
  priority?: string
  status?: string
  assetId?: string
  onlyOverdue?: string
}

export interface OperationalReportRow {
  type: 'request' | 'work_order'
  id: string
  number?: number
  title: string
  property: string | null
  asset: string | null
  requester: string | null
  dispatcher: string | null
  resolver: string | null
  priority: string
  status: string
  createdAt: string
  dueAt: string | null
  completedAt: string | null
}

export interface OperationalReport {
  period: { from: string; to: string }
  kpi: {
    totalTickets: number
    openTickets: number
    overdueTickets: number
    totalWo: number
    openWo: number
    completedWo: number
    avgResolveHours: number | null
    avgCompleteHours: number | null
  }
  ticketsByStatus: { status: string; count: number }[]
  ticketsByPriority: { priority: string; count: number }[]
  woByStatus: { status: string; count: number }[]
  woByPriority: { priority: string; count: number }[]
  topAssets: { id: string; name: string; count: number }[]
  topResolvers: { id: string; name: string; count: number }[]
  tickets: OperationalReportRow[]
  workOrders: OperationalReportRow[]
}

export interface AssetReportRow {
  id: string
  name: string
  category: string
  property: string | null
  assetType: string | null
  requestCount: number
  workOrderCount: number
  protocolCount: number
  openWorkOrders: number
  overdueWorkOrders: number
  totalInterventions: number
  lastActivity: string | null
}

export interface AssetReport {
  period: { from: string; to: string }
  kpi: {
    totalAssets: number
    assetsWithIssues: number
    totalRequests: number
    totalWorkOrders: number
    totalOpenWo: number
    totalOverdueWo: number
  }
  rows: AssetReportRow[]
}

export interface ProtocolReportRow {
  id: string
  number: string
  title: string | null
  protocolType: string
  status: string
  sourceType: string
  property: string | null
  resolverName: string | null
  createdAt: string
  completedAt: string | null
  handoverAt: string | null
  satisfaction: string | null
  hasGeneratedPdf: boolean
  hasSignedDocument: boolean
  lineCount: number
}

export interface ProtocolReport {
  period: { from: string; to: string }
  kpi: {
    total: number
    completed: number
    confirmed: number
    withPdf: number
    withoutPdf: number
    withSigned: number
  }
  byType: { type: string; count: number }[]
  byStatus: { status: string; count: number }[]
  rows: ProtocolReportRow[]
}

export interface ReportSubscription {
  id: string
  tenantId: string
  userId: string
  reportType: string
  frequency: string
  format: string
  propertyId: string | null
  isEnabled: boolean
  lastSentAt: string | null
  createdAt: string
  updatedAt: string
}

export const operationsReportsApi = {
  operations: async (params?: OperationalReportFilters) => {
    const { data } = await apiClient.get<OperationalReport>('/reports/operations', { params })
    return data
  },

  assets: async (params?: { propertyId?: string; assetId?: string; dateFrom?: string; dateTo?: string }) => {
    const { data } = await apiClient.get<AssetReport>('/reports/assets', { params })
    return data
  },

  protocols: async (params?: { propertyId?: string; dateFrom?: string; dateTo?: string; protocolType?: string; status?: string }) => {
    const { data } = await apiClient.get<ProtocolReport>('/reports/protocols', { params })
    return data
  },

  exportUrl: (type: 'operations' | 'assets' | 'protocols', params: Record<string, string>) => {
    const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
    const qs = new URLSearchParams(params).toString()
    return `${baseUrl}/reports/${type}/export${qs ? `?${qs}` : ''}`
  },

  subscriptions: {
    list: async () => {
      const { data } = await apiClient.get<ReportSubscription[]>('/reports/subscriptions')
      return data
    },
    upsert: async (dto: { reportType: string; frequency?: string; format?: string; propertyId?: string | null; isEnabled?: boolean }) => {
      const { data } = await apiClient.post<ReportSubscription>('/reports/subscriptions', dto)
      return data
    },
  },
}
