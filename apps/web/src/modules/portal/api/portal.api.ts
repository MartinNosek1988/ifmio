import { apiClient } from '../../../core/api/client'

export const portalApi = {
  getMyUnits: () =>
    apiClient.get('/portal/my-units').then(r => r.data),
  getMyPrescriptions: () =>
    apiClient.get('/portal/my-prescriptions').then(r => r.data),
  getMySettlements: () =>
    apiClient.get('/portal/my-settlements').then(r => r.data),
  getMyTickets: () =>
    apiClient.get('/portal/my-tickets').then(r => r.data),
  createTicket: (data: { title: string; description?: string; category?: string; priority?: string; unitId?: string }) =>
    apiClient.post('/portal/tickets', data).then(r => r.data),
  getMyMeters: () =>
    apiClient.get('/portal/my-meters').then(r => r.data),
  submitReading: (meterId: string, data: { value: number; readingDate: string; note?: string }) =>
    apiClient.post(`/portal/meters/${meterId}/readings`, data).then(r => r.data),
  getMyDocuments: () =>
    apiClient.get('/portal/my-documents').then(r => r.data),
  getMyKonto: () =>
    apiClient.get('/portal/my-konto').then(r => r.data),
  getMyVotings: () =>
    apiClient.get('/portal/my-votings').then(r => r.data),
  getMyESignRequests: () =>
    apiClient.get('/portal/my-esign').then(r => r.data),
  getUnitDetail: (unitId: string) =>
    apiClient.get(`/portal/units/${unitId}`).then(r => r.data),
  getMyMessages: () =>
    apiClient.get('/portal/my-messages').then(r => r.data),
  sendMessage: (data: { subject: string; body: string }) =>
    apiClient.post('/portal/my-messages', data).then(r => r.data),
  markMessageRead: (id: string) =>
    apiClient.patch(`/portal/my-messages/${id}/read`).then(r => r.data),
  getUnreadMessageCount: () =>
    apiClient.get('/portal/my-messages/unread-count').then(r => r.data),
}
