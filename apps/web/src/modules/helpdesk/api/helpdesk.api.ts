import { apiClient } from '../../../core/api/client'

export const helpdeskApi = {
  list:   (params?: any) =>
    apiClient.get('/helpdesk', { params }).then((r) => r.data),
  detail: (id: string) =>
    apiClient.get(`/helpdesk/${id}`).then((r) => r.data),
  create: (dto: any) =>
    apiClient.post('/helpdesk', dto).then((r) => r.data),
  update: (id: string, dto: any) =>
    apiClient.put(`/helpdesk/${id}`, dto).then((r) => r.data),

  items: {
    add:    (ticketId: string, dto: any) =>
      apiClient.post(`/helpdesk/${ticketId}/items`, dto).then((r) => r.data),
    remove: (ticketId: string, itemId: string) =>
      apiClient.delete(`/helpdesk/${ticketId}/items/${itemId}`).then((r) => r.data),
  },

  protocol: {
    get:    (ticketId: string) =>
      apiClient.get(`/helpdesk/${ticketId}/protocol`).then((r) => r.data),
    save:   (ticketId: string, dto: any) =>
      apiClient.post(`/helpdesk/${ticketId}/protocol`, dto).then((r) => r.data),
  },
}
