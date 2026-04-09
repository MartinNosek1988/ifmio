import { apiClient } from '../../../core/api/client'

export interface CrmLead {
  id: string
  companyName: string
  ico?: string
  address?: string
  city?: string
  leadType: string
  stage: string
  priority: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  contactRole?: string
  estimatedUnits?: number
  estimatedMrr?: number
  source?: string
  assignedTo?: string
  nextFollowUpAt?: string
  lastContactedAt?: string
  note?: string
  closedAt?: string
  closedReason?: string
  createdAt: string
  updatedAt: string
  kbOrganization?: { id: string; name: string; ico: string; city?: string }
  activities?: CrmActivity[]
}

export interface CrmActivity {
  id: string
  leadId: string
  type: string
  title: string
  body?: string
  occurredAt: string
  createdBy: string
}

export interface KanbanColumn {
  stage: string
  leads: CrmLead[]
  count: number
  totalMrr: number
}

export const crmPipelineApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get('/crm-pipeline/leads', { params }).then((r) => r.data),
  stats: () => apiClient.get('/crm-pipeline/leads/stats').then((r) => r.data),
  kanban: (params?: Record<string, string>) =>
    apiClient.get('/crm-pipeline/leads/kanban', { params }).then((r) => r.data),
  getById: (id: string) =>
    apiClient.get(`/crm-pipeline/leads/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/crm-pipeline/leads', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/crm-pipeline/leads/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/crm-pipeline/leads/${id}`),
  changeStage: (id: string, stage: string, closedReason?: string) =>
    apiClient
      .post(`/crm-pipeline/leads/${id}/stage`, { stage, closedReason })
      .then((r) => r.data),
  addActivity: (id: string, data: Record<string, unknown>) =>
    apiClient
      .post(`/crm-pipeline/leads/${id}/activities`, data)
      .then((r) => r.data),
  kbCandidates: (params?: Record<string, string>) =>
    apiClient.get('/crm-pipeline/kb-candidates', { params }).then((r) => r.data),
  importFromKb: (ids: string[]) =>
    apiClient.post('/crm-pipeline/import-from-kb', { ids }).then((r) => r.data),
}
