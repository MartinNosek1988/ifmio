import { apiClient } from '../../../core/api/client'

export interface PrescriptionComponentSummary {
  id: string
  tenantId: string
  propertyId: string
  name: string
  code: string | null
  componentType: string
  calculationMethod: string
  defaultAmount: number
  vatRate: number
  sortOrder: number
  isActive: boolean
  effectiveFrom: string
  effectiveTo: string | null
  description: string | null
  accountingCode: string | null
  _count?: { assignments: number }
}

export interface ComponentAssignmentRow {
  id: string
  componentId: string
  unitId: string
  overrideAmount: number | null
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  note: string | null
  unit: { id: string; name: string; area: number | null; personCount: number | null; commonAreaShare: number | null }
}

export interface ComponentDetail extends PrescriptionComponentSummary {
  assignments: ComponentAssignmentRow[]
}

export interface UnitPrescriptionPreview {
  total: number
  items: Array<{
    componentId: string
    componentName: string
    componentCode: string | null
    componentType: string
    amount: number
    calculationDetail: string
    vatRate: number
    isOverride: boolean
  }>
}

export interface PropertyPrescriptionPreview {
  unitId: string
  unitName: string
  residentName: string | null
  total: number
  items: Array<{ componentName: string; amount: number }>
}

export interface GenerationDetail {
  unitId: string
  unitName: string
  residentName: string | null
  amount: number
  items: Array<{ name: string; amount: number }>
  status: 'created' | 'skipped_duplicate' | 'skipped_no_components' | 'skipped_unoccupied' | 'error'
  error?: string
}

export interface GenerationResult {
  generated: number
  skipped: number
  totalAmount: number
  details: GenerationDetail[]
}

export const componentsApi = {
  list: (propertyId: string, activeOnly = true) =>
    apiClient.get<PrescriptionComponentSummary[]>(`/properties/${propertyId}/components`, { params: { activeOnly } }).then(r => r.data),

  getOne: (propertyId: string, componentId: string) =>
    apiClient.get<ComponentDetail>(`/properties/${propertyId}/components/${componentId}`).then(r => r.data),

  create: (propertyId: string, data: Record<string, unknown>) =>
    apiClient.post<PrescriptionComponentSummary>(`/properties/${propertyId}/components`, data).then(r => r.data),

  update: (propertyId: string, componentId: string, data: Record<string, unknown>) =>
    apiClient.put<PrescriptionComponentSummary>(`/properties/${propertyId}/components/${componentId}`, data).then(r => r.data),

  archive: (propertyId: string, componentId: string) =>
    apiClient.delete(`/properties/${propertyId}/components/${componentId}`).then(r => r.data),

  assignUnits: (propertyId: string, componentId: string, data: { unitIds: string[]; effectiveFrom: string; overrideAmount?: number }) =>
    apiClient.post(`/properties/${propertyId}/components/${componentId}/assign`, data).then(r => r.data),

  removeAssignment: (propertyId: string, assignmentId: string) =>
    apiClient.delete(`/properties/${propertyId}/components/assignments/${assignmentId}`).then(r => r.data),

  updateAssignment: (propertyId: string, assignmentId: string, data: { overrideAmount?: number | null; note?: string }) =>
    apiClient.patch(`/properties/${propertyId}/components/assignments/${assignmentId}`, data).then(r => r.data),

  unitComponents: (propertyId: string, unitId: string) =>
    apiClient.get(`/properties/${propertyId}/components/units/${unitId}`).then(r => r.data),

  unitPreview: (propertyId: string, unitId: string) =>
    apiClient.get<UnitPrescriptionPreview>(`/properties/${propertyId}/components/units/${unitId}/prescription-preview`).then(r => r.data),

  propertyPreview: (propertyId: string, month?: number, year?: number) =>
    apiClient.get<PropertyPrescriptionPreview[]>(`/properties/${propertyId}/components/prescription-preview`, { params: { month, year } }).then(r => r.data),

  generateFromComponents: (propertyId: string, data: { month: number; year: number; dueDay?: number; dryRun?: boolean }) =>
    apiClient.post<GenerationResult>(`/properties/${propertyId}/components/generate-prescriptions`, data).then(r => r.data),
}
