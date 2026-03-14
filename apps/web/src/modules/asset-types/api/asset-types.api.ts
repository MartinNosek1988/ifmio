import { apiClient } from '../../../core/api/client'

// ─── Types ────────────────────────────────────────────────────────

export interface ApiAssetType {
  id: string
  tenantId: string
  name: string
  code: string
  category: string
  description: string | null
  manufacturer: string | null
  model: string | null
  defaultLocationLabel: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { assets: number; activityAssignments: number }
}

export interface ApiAssetTypeAssignment {
  id: string
  tenantId: string
  assetTypeId: string
  revisionTypeId: string
  isRequired: boolean
  intervalDaysOverride: number | null
  reminderDaysOverride: number | null
  graceDaysOverride: number | null
  requiresProtocolOverride: boolean | null
  requiresSupplierSignatureOverride: boolean | null
  requiresCustomerSignatureOverride: boolean | null
  note: string | null
  sortOrder: number
  revisionType: {
    id: string
    code: string
    name: string
    color: string | null
    defaultIntervalDays: number
    defaultReminderDaysBefore: number
    requiresProtocol: boolean
    requiresSupplierSignature: boolean
    requiresCustomerSignature: boolean
    graceDaysAfterEvent: number
  }
}

export interface ApiEffectiveTemplateRule {
  revisionTypeId: string
  code: string
  name: string
  color: string | null
  isRequired: boolean
  effectiveIntervalDays: number
  effectiveReminderDays: number
  effectiveGraceDays: number
  effectiveRequiresProtocol: boolean
  effectiveRequiresSupplierSignature: boolean
  effectiveRequiresCustomerSignature: boolean
  note: string | null
  sortOrder: number
}

// ─── Payloads ─────────────────────────────────────────────────────

export interface CreateAssetTypePayload {
  name: string
  code: string
  category?: string
  description?: string
  manufacturer?: string
  model?: string
  defaultLocationLabel?: string
}

export interface CreateAssignmentPayload {
  revisionTypeId: string
  isRequired?: boolean
  intervalDaysOverride?: number
  reminderDaysOverride?: number
  graceDaysOverride?: number
  requiresProtocolOverride?: boolean
  requiresSupplierSignatureOverride?: boolean
  requiresCustomerSignatureOverride?: boolean
  note?: string
  sortOrder?: number
}

// ─── API ──────────────────────────────────────────────────────────

export const assetTypesApi = {
  list: () =>
    apiClient.get<ApiAssetType[]>('/asset-types').then((r) => r.data),
  get: (id: string) =>
    apiClient.get<ApiAssetType>(`/asset-types/${id}`).then((r) => r.data),
  create: (dto: CreateAssetTypePayload) =>
    apiClient.post<ApiAssetType>('/asset-types', dto).then((r) => r.data),
  update: (id: string, dto: Partial<CreateAssetTypePayload> & { isActive?: boolean }) =>
    apiClient.patch<ApiAssetType>(`/asset-types/${id}`, dto).then((r) => r.data),
  remove: (id: string) =>
    apiClient.delete(`/asset-types/${id}`),

  // Assignments
  assignments: {
    list: (assetTypeId: string) =>
      apiClient.get<ApiAssetTypeAssignment[]>(`/asset-types/${assetTypeId}/activity-templates`).then((r) => r.data),
    create: (assetTypeId: string, dto: CreateAssignmentPayload) =>
      apiClient.post<ApiAssetTypeAssignment>(`/asset-types/${assetTypeId}/activity-templates`, dto).then((r) => r.data),
    update: (assetTypeId: string, assignmentId: string, dto: Record<string, unknown>) =>
      apiClient.patch<ApiAssetTypeAssignment>(`/asset-types/${assetTypeId}/activity-templates/${assignmentId}`, dto).then((r) => r.data),
    remove: (assetTypeId: string, assignmentId: string) =>
      apiClient.delete(`/asset-types/${assetTypeId}/activity-templates/${assignmentId}`),
  },

  // Preview
  previewPlans: (assetTypeId: string) =>
    apiClient.get<ApiEffectiveTemplateRule[]>(`/asset-types/${assetTypeId}/preview-plans`).then((r) => r.data),
}
