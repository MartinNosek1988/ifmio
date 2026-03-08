import { apiClient } from '../../../core/api/client'

export const remindersApi = {
  templates: {
    list:   () =>
      apiClient.get('/reminders/templates').then((r) => r.data),
    seed:   () =>
      apiClient.post('/reminders/templates/seed').then((r) => r.data),
    update: (id: string, dto: any) =>
      apiClient.put(`/reminders/templates/${id}`, dto).then((r) => r.data),
    render: (templateId: string, residentId: string) =>
      apiClient
        .get(`/reminders/templates/${templateId}/render/${residentId}`)
        .then((r) => r.data),
  },

  debtors: () =>
    apiClient.get('/reminders/debtors').then((r) => r.data),

  list: (params?: any) =>
    apiClient.get('/reminders', { params }).then((r) => r.data),

  create: (dto: any) =>
    apiClient.post('/reminders', dto).then((r) => r.data),

  bulkCreate: (dto: any) =>
    apiClient.post('/reminders/bulk', dto).then((r) => r.data),

  markAsSent: (id: string) =>
    apiClient.patch(`/reminders/${id}/send`).then((r) => r.data),

  markAsPaid: (id: string) =>
    apiClient.patch(`/reminders/${id}/paid`).then((r) => r.data),
}
