import { apiClient } from '../../../core/api/client'

export interface ApiCampaign {
  id: string
  name: string
  subject: string
  body: string
  channel: 'email' | 'sms' | 'both'
  recipientType: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  scheduledAt?: string
  sentAt?: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  openedCount: number
  createdAt: string
  property?: { id: string; name: string }
}

export interface ApiCampaignRecipient {
  id: string
  name?: string
  email?: string
  phone?: string
  status: 'pending' | 'sent' | 'failed' | 'opened'
  sentAt?: string
  errorMessage?: string
}

export const massMailingApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/mass-mailing', { params }).then(r => r.data),
  stats: () =>
    apiClient.get('/mass-mailing/stats').then(r => r.data),
  getById: (id: string) =>
    apiClient.get(`/mass-mailing/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/mass-mailing', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/mass-mailing/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/mass-mailing/${id}`),
  preview: (id: string) =>
    apiClient.post(`/mass-mailing/${id}/preview`).then(r => r.data),
  send: (id: string) =>
    apiClient.post(`/mass-mailing/${id}/send`).then(r => r.data),
  schedule: (id: string, scheduledAt: string) =>
    apiClient.post(`/mass-mailing/${id}/schedule`, { scheduledAt }).then(r => r.data),
  cancel: (id: string) =>
    apiClient.post(`/mass-mailing/${id}/cancel`).then(r => r.data),
  recipients: (id: string, params?: Record<string, any>) =>
    apiClient.get(`/mass-mailing/${id}/recipients`, { params }).then(r => r.data),
}
