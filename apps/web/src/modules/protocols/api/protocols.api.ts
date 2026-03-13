import { apiClient } from '../../../core/api/client'

// ─── Types ────────────────────────────────────────────────────────

export interface ApiProtocolLine {
  id: string
  protocolId: string
  lineType: string
  name: string
  unit: string | null
  quantity: number
  description: string | null
  sortOrder: number
  createdAt: string
}

export interface ApiProtocol {
  id: string
  tenantId: string
  sourceType: 'helpdesk' | 'revision' | 'work_order'
  sourceId: string
  protocolType: 'work_report' | 'handover' | 'revision_report' | 'service_protocol'
  number: string
  status: 'draft' | 'completed' | 'confirmed'
  supplierSnapshot: Record<string, unknown> | null
  customerSnapshot: Record<string, unknown> | null
  requesterName: string | null
  dispatcherName: string | null
  resolverName: string | null
  description: string | null
  transportKm: number | null
  transportMode: string | null
  handoverAt: string | null
  satisfaction: 'satisfied' | 'partially_satisfied' | 'dissatisfied' | null
  satisfactionComment: string | null
  supplierSignatureName: string | null
  customerSignatureName: string | null
  supplierSignedAt: string | null
  customerSignedAt: string | null
  generatedPdfDocumentId: string | null
  signedDocumentId: string | null
  createdAt: string
  updatedAt: string
  lines: ApiProtocolLine[]
  _count?: { lines: number }
}

export interface PaginatedProtocols {
  data: ApiProtocol[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Payloads ─────────────────────────────────────────────────────

export interface CreateProtocolPayload {
  sourceType: string
  sourceId: string
  protocolType?: string
  description?: string
  requesterName?: string
  dispatcherName?: string
  resolverName?: string
  transportKm?: number
  transportMode?: string
  supplierSnapshot?: Record<string, unknown>
  customerSnapshot?: Record<string, unknown>
}

export interface UpdateProtocolPayload {
  description?: string
  requesterName?: string
  dispatcherName?: string
  resolverName?: string
  transportKm?: number
  transportMode?: string
  handoverAt?: string
  satisfaction?: string
  satisfactionComment?: string
  supplierSignatureName?: string
  customerSignatureName?: string
  supplierSignedAt?: string
  customerSignedAt?: string
  status?: string
  supplierSnapshot?: Record<string, unknown>
  customerSnapshot?: Record<string, unknown>
}

export interface CompleteProtocolPayload {
  handoverAt?: string
  satisfaction?: string
  satisfactionComment?: string
  supplierSignatureName?: string
  customerSignatureName?: string
}

export interface CreateProtocolLinePayload {
  lineType?: string
  name: string
  unit?: string
  quantity?: number
  description?: string
  sortOrder?: number
}

export interface GenerateProtocolPayload {
  sourceType: string
  sourceId: string
  protocolType?: string
}

// ─── API ──────────────────────────────────────────────────────────

export const protocolsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedProtocols>('/protocols', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ApiProtocol>(`/protocols/${id}`).then((r) => r.data),

  getBySource: (sourceType: string, sourceId: string) =>
    apiClient.get<ApiProtocol[]>(`/protocols/by-source/${sourceType}/${sourceId}`).then((r) => r.data),

  create: (dto: CreateProtocolPayload) =>
    apiClient.post<ApiProtocol>('/protocols', dto).then((r) => r.data),

  generate: (dto: GenerateProtocolPayload) =>
    apiClient.post<ApiProtocol>('/protocols/generate', dto).then((r) => r.data),

  update: (id: string, dto: UpdateProtocolPayload) =>
    apiClient.patch<ApiProtocol>(`/protocols/${id}`, dto).then((r) => r.data),

  complete: (id: string, dto: CompleteProtocolPayload) =>
    apiClient.post<ApiProtocol>(`/protocols/${id}/complete`, dto).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/protocols/${id}`),

  // Lines
  addLine: (protocolId: string, dto: CreateProtocolLinePayload) =>
    apiClient.post<ApiProtocolLine>(`/protocols/${protocolId}/lines`, dto).then((r) => r.data),

  updateLine: (protocolId: string, lineId: string, dto: Partial<CreateProtocolLinePayload>) =>
    apiClient.patch<ApiProtocolLine>(`/protocols/${protocolId}/lines/${lineId}`, dto).then((r) => r.data),

  removeLine: (protocolId: string, lineId: string) =>
    apiClient.delete(`/protocols/${protocolId}/lines/${lineId}`),
}
