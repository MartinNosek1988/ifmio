import { apiClient } from '../../../core/api/client'

export interface ApiTicket {
  id: string
  tenantId: string
  number: number
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  propertyId: string | null
  unitId: string | null
  residentId: string | null
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  responseDueAt: string | null
  resolutionDueAt: string | null
  firstResponseAt: string | null
  escalationLevel: number
  escalatedAt: string | null
  property?: { id: string; name: string } | null
  unit?: { id: string; name: string } | null
  resident?: { id: string; firstName: string; lastName: string } | null
  assignee?: { id: string; name: string } | null
  _count?: { items: number }
  items?: ApiTicketItem[]
  protocol?: ApiTicketProtocol | null
}

export interface ApiTicketItem {
  id: string
  ticketId: string
  description: string
  unit: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
}

export interface ApiTicketProtocol {
  id: string
  ticketId: string
  number: string
  workerName: string | null
  workerDate: string | null
  clientName: string | null
  clientSigned: boolean
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedTickets {
  data: ApiTicket[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateTicketPayload {
  title: string
  description?: string
  category?: string
  priority?: string
  propertyId?: string
  unitId?: string
}

export interface UpdateTicketPayload {
  title?: string
  description?: string
  category?: string
  priority?: string
  status?: string
  assigneeId?: string
}

export interface CreateItemPayload {
  description: string
  unit?: string
  quantity?: number
  unitPrice?: number
}

export interface SlaStats {
  total: number
  overdue: number
  escalated: number
  dueSoon: number
}

export interface DashboardKpi {
  total: number
  open: number
  overdue: number
  escalated: number
  dueSoon: number
  resolvedInPeriod: number
  createdInPeriod: number
  slaCompliancePct: number
}

export interface DashboardData {
  kpi: DashboardKpi
  byPriority: { priority: string; open: number; total: number }[]
  byProperty: { propertyId: string | null; name: string; count: number }[]
  trend: { date: string; created: number; resolved: number }[]
  topRisk: ApiTicket[]
}

export const helpdeskApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedTickets>('/helpdesk', { params }).then((r) => r.data),

  detail: (id: string) =>
    apiClient.get<ApiTicket>(`/helpdesk/${id}`).then((r) => r.data),

  slaStats: () =>
    apiClient.get<SlaStats>('/helpdesk/sla-stats').then((r) => r.data),

  dashboard: (days = 30) =>
    apiClient.get<DashboardData>('/helpdesk/dashboard', { params: { days } }).then((r) => r.data),

  create: (dto: CreateTicketPayload) =>
    apiClient.post<ApiTicket>('/helpdesk', dto).then((r) => r.data),

  update: (id: string, dto: UpdateTicketPayload) =>
    apiClient.put<ApiTicket>(`/helpdesk/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/helpdesk/${id}`),

  items: {
    add: (ticketId: string, dto: CreateItemPayload) =>
      apiClient.post<ApiTicketItem>(`/helpdesk/${ticketId}/items`, dto).then((r) => r.data),
    remove: (ticketId: string, itemId: string) =>
      apiClient.delete(`/helpdesk/${ticketId}/items/${itemId}`),
  },

  protocol: {
    get: (ticketId: string) =>
      apiClient.get<ApiTicketProtocol>(`/helpdesk/${ticketId}/protocol`).then((r) => r.data),
    save: (ticketId: string, dto: Record<string, unknown>) =>
      apiClient.post<ApiTicketProtocol>(`/helpdesk/${ticketId}/protocol`, dto).then((r) => r.data),
  },
}
