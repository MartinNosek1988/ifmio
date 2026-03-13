import { apiClient } from '../../../core/api/client'

// ─── Types ────────────────────────────────────────────────────────

export interface ApiRevisionSubject {
  id: string
  tenantId: string
  propertyId: string | null
  name: string
  category: string
  description: string | null
  location: string | null
  assetTag: string | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  property?: { id: string; name: string } | null
}

export interface ApiRevisionType {
  id: string
  tenantId: string
  code: string
  name: string
  description: string | null
  defaultIntervalDays: number
  defaultReminderDaysBefore: number
  color: string | null
  isActive: boolean
  requiresProtocol: boolean
  defaultProtocolType: string | null
  requiresSupplierSignature: boolean
  requiresCustomerSignature: boolean
  graceDaysAfterEvent: number
  createdAt: string
  updatedAt: string
}

export interface ApiRevisionPlan {
  id: string
  tenantId: string
  propertyId: string | null
  revisionSubjectId: string
  revisionTypeId: string
  title: string
  description: string | null
  intervalDays: number
  reminderDaysBefore: number
  vendorName: string | null
  responsibleUserId: string | null
  lastPerformedAt: string | null
  nextDueAt: string
  status: string
  isMandatory: boolean
  createdAt: string
  updatedAt: string
  complianceStatus?: 'compliant' | 'due_soon' | 'overdue' | 'overdue_critical' | 'performed_pending_protocol' | 'performed_pending_signature' | 'performed_unconfirmed'
  property?: { id: string; name: string } | null
  revisionSubject?: { id: string; name: string; location?: string; manufacturer?: string; model?: string } | null
  revisionType?: {
    id: string; name: string; code?: string; color?: string | null
    requiresProtocol?: boolean; defaultProtocolType?: string | null
    requiresSupplierSignature?: boolean; requiresCustomerSignature?: boolean
    graceDaysAfterEvent?: number
  } | null
  responsibleUser?: { id: string; name: string } | null
  _count?: { events: number }
  events?: ApiRevisionEvent[]
  nextAction?: {
    action: string
    label: string
    description: string
    targetEntityType?: string
    targetEntityId?: string
  } | null
}

export interface ApiRevisionEvent {
  id: string
  tenantId: string
  propertyId: string | null
  revisionPlanId: string
  scheduledAt: string | null
  performedAt: string | null
  validUntil: string | null
  resultStatus: string
  summary: string | null
  notes: string | null
  vendorName: string | null
  performedBy: string | null
  protocolDocumentId: string | null
  createdAt: string
  updatedAt: string
  revisionPlan?: { id: string; title: string } | null
  property?: { id: string; name: string } | null
  protocol?: { id: string; number: string; status: string } | null
  autoProtocol?: { id: string; number: string; status: string } | null
}

export interface PaginatedPlans {
  data: ApiRevisionPlan[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface RevisionDashboardKpi {
  totalPlans: number
  compliant: number
  dueSoon: number
  overdue: number
  overdueCritical: number
  pendingProtocol: number
  pendingSignature: number
  unconfirmed: number
  performedInPeriod: number
}

export interface RevisionDashboardData {
  kpi: RevisionDashboardKpi
  byType: { revisionTypeId: string; name: string; total: number; overdue: number; dueSoon: number }[]
  byProperty: { propertyId: string; name: string; total: number; overdue: number; dueSoon: number }[]
  upcoming: ApiRevisionPlan[]
  topRisk: ApiRevisionPlan[]
}

// ─── Payloads ─────────────────────────────────────────────────────

export interface CreateSubjectPayload {
  name: string
  propertyId?: string
  category?: string
  description?: string
  location?: string
  assetTag?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
}

export interface CreateTypePayload {
  code: string
  name: string
  description?: string
  defaultIntervalDays?: number
  defaultReminderDaysBefore?: number
  color?: string
  requiresProtocol?: boolean
  defaultProtocolType?: string
  requiresSupplierSignature?: boolean
  requiresCustomerSignature?: boolean
  graceDaysAfterEvent?: number
}

export interface CreatePlanPayload {
  revisionSubjectId: string
  revisionTypeId: string
  title: string
  propertyId?: string
  description?: string
  intervalDays: number
  reminderDaysBefore?: number
  vendorName?: string
  responsibleUserId?: string
  nextDueAt?: string
  lastPerformedAt?: string
  isMandatory?: boolean
}

export interface CreateEventPayload {
  revisionPlanId: string
  scheduledAt?: string
  performedAt?: string
  validUntil?: string
  resultStatus?: string
  summary?: string
  notes?: string
  vendorName?: string
  performedBy?: string
  protocolDocumentId?: string
}

// ─── API ──────────────────────────────────────────────────────────

export const revisionsApi = {
  // Subjects
  subjects: {
    list: () =>
      apiClient.get<ApiRevisionSubject[]>('/revisions/subjects').then((r) => r.data),
    get: (id: string) =>
      apiClient.get<ApiRevisionSubject>(`/revisions/subjects/${id}`).then((r) => r.data),
    create: (dto: CreateSubjectPayload) =>
      apiClient.post<ApiRevisionSubject>('/revisions/subjects', dto).then((r) => r.data),
    update: (id: string, dto: Partial<CreateSubjectPayload> & { isActive?: boolean }) =>
      apiClient.patch<ApiRevisionSubject>(`/revisions/subjects/${id}`, dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/revisions/subjects/${id}`),
  },

  // Types
  types: {
    list: () =>
      apiClient.get<ApiRevisionType[]>('/revisions/types').then((r) => r.data),
    create: (dto: CreateTypePayload) =>
      apiClient.post<ApiRevisionType>('/revisions/types', dto).then((r) => r.data),
    update: (id: string, dto: Partial<CreateTypePayload> & { isActive?: boolean }) =>
      apiClient.patch<ApiRevisionType>(`/revisions/types/${id}`, dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/revisions/types/${id}`),
  },

  // Plans
  plans: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedPlans>('/revisions/plans', { params }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<ApiRevisionPlan>(`/revisions/plans/${id}`).then((r) => r.data),
    create: (dto: CreatePlanPayload) =>
      apiClient.post<ApiRevisionPlan>('/revisions/plans', dto).then((r) => r.data),
    update: (id: string, dto: Record<string, unknown>) =>
      apiClient.patch<ApiRevisionPlan>(`/revisions/plans/${id}`, dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/revisions/plans/${id}`),
    recordEvent: (planId: string, dto: Partial<CreateEventPayload>) =>
      apiClient.post<ApiRevisionEvent>(`/revisions/plans/${planId}/record-event`, dto).then((r) => r.data),
    history: (planId: string) =>
      apiClient.get<ApiRevisionEvent[]>(`/revisions/plans/${planId}/history`).then((r) => r.data),
  },

  // Events
  events: {
    list: (planId?: string) =>
      apiClient.get<ApiRevisionEvent[]>('/revisions/events', { params: planId ? { planId } : {} }).then((r) => r.data),
    get: (id: string) =>
      apiClient.get<ApiRevisionEvent>(`/revisions/events/${id}`).then((r) => r.data),
    create: (dto: CreateEventPayload) =>
      apiClient.post<ApiRevisionEvent>('/revisions/events', dto).then((r) => r.data),
    update: (id: string, dto: Record<string, unknown>) =>
      apiClient.patch<ApiRevisionEvent>(`/revisions/events/${id}`, dto).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete(`/revisions/events/${id}`),
  },

  // Dashboard
  dashboard: (days = 30) =>
    apiClient.get<RevisionDashboardData>('/revisions/dashboard', { params: { days } }).then((r) => r.data),
}
