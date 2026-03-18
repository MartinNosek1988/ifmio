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
}
