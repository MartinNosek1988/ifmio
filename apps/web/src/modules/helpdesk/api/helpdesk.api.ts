import { apiClient } from '../../../core/api/client'

export interface ApiUser {
  id: string
  name: string
  email?: string
}

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
  assetId: string | null
  assigneeId: string | null
  requesterUserId: string | null
  dispatcherUserId: string | null
  deadlineManuallySet: boolean
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  responseDueAt: string | null
  resolutionDueAt: string | null
  firstResponseAt: string | null
  escalationLevel: number
  escalatedAt: string | null
  recurringPlanId: string | null
  requestOrigin: string | null
  plannedForDate: string | null
  generationKey: string | null
  recurringPlan?: { id: string; title: string; scheduleMode: string; frequencyUnit: string; frequencyInterval: number; assetId?: string } | null
  property?: { id: string; name: string } | null
  unit?: { id: string; name: string } | null
  resident?: { id: string; firstName: string; lastName: string } | null
  asset?: { id: string; name: string } | null
  assignee?: ApiUser | null
  requester?: ApiUser | null
  dispatcher?: ApiUser | null
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
  residentId?: string
  assetId?: string
  requesterUserId?: string
  dispatcherUserId?: string
  assigneeId?: string
}

export interface UpdateTicketPayload {
  title?: string
  description?: string
  category?: string
  priority?: string
  status?: string
  assigneeId?: string
  assetId?: string
  requesterUserId?: string
  dispatcherUserId?: string
  resolutionDueAt?: string
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

export interface ApiSlaPolicy {
  id: string
  tenantId: string
  propertyId: string | null
  lowResponseH: number
  lowResolutionH: number
  mediumResponseH: number
  mediumResolutionH: number
  highResponseH: number
  highResolutionH: number
  urgentResponseH: number
  urgentResolutionH: number
  createdAt: string
  updatedAt: string
  property?: { id: string; name: string } | null
}

export interface UpsertSlaPolicyPayload {
  propertyId?: string | null
  lowResponseH?: number
  lowResolutionH?: number
  mediumResponseH?: number
  mediumResolutionH?: number
  highResponseH?: number
  highResolutionH?: number
  urgentResponseH?: number
  urgentResolutionH?: number
}

export const helpdeskApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedTickets>('/helpdesk', { params }).then((r) => r.data),

  detail: (id: string) =>
    apiClient.get<ApiTicket>(`/helpdesk/${id}`).then((r) => r.data),

  slaStats: (propertyId?: string) =>
    apiClient.get<SlaStats>('/helpdesk/sla-stats', { params: propertyId ? { propertyId } : undefined }).then((r) => r.data),

  dashboard: (days = 30, propertyId?: string) =>
    apiClient.get<DashboardData>('/helpdesk/dashboard', { params: { days, ...(propertyId && { propertyId }) } }).then((r) => r.data),

  create: (dto: CreateTicketPayload) =>
    apiClient.post<ApiTicket>('/helpdesk', dto).then((r) => r.data),

  update: (id: string, dto: UpdateTicketPayload) =>
    apiClient.put<ApiTicket>(`/helpdesk/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/helpdesk/${id}`),

  assign: (id: string, assigneeId: string) =>
    apiClient.post<ApiTicket>(`/helpdesk/${id}/assign`, { assigneeId }).then((r) => r.data),

  claim: (id: string) =>
    apiClient.post<ApiTicket>(`/helpdesk/${id}/claim`).then((r) => r.data),

  resolve: (id: string) =>
    apiClient.post<ApiTicket>(`/helpdesk/${id}/resolve`).then((r) => r.data),

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

  slaPolicies: {
    list: () =>
      apiClient.get<ApiSlaPolicy[]>('/helpdesk/sla-policies').then((r) => r.data),
    upsert: (dto: UpsertSlaPolicyPayload) =>
      apiClient.post<ApiSlaPolicy>('/helpdesk/sla-policies', dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/helpdesk/sla-policies/${id}`),
  },
}
