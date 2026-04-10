import { apiClient } from '../../core/api/client'

export interface BoardMessage {
  id: string
  title: string
  body: string
  visibility: string
  tags: string[]
  isPinned: boolean
  status: string
  authorId: string
  author?: { id: string; name: string }
  reviewedBy?: string
  reviewedAt?: string
  rejectionNote?: string
  validFrom?: string
  validUntil?: string
  createdAt: string
  _count?: { readReceipts: number }
  isRead?: boolean
}

export const boardMessagesApi = {
  // Admin (property-scoped)
  list: (propertyId: string, params?: Record<string, string>) =>
    apiClient.get(`/properties/${propertyId}/board-messages`, { params }).then(r => r.data),
  pendingCount: (propertyId: string) =>
    apiClient.get(`/properties/${propertyId}/board-messages/pending-count`).then(r => r.data),
  getById: (propertyId: string, id: string) =>
    apiClient.get(`/properties/${propertyId}/board-messages/${id}`).then(r => r.data),
  create: (propertyId: string, data: Record<string, unknown>) =>
    apiClient.post(`/properties/${propertyId}/board-messages`, data).then(r => r.data),
  update: (propertyId: string, id: string, data: Record<string, unknown>) =>
    apiClient.put(`/properties/${propertyId}/board-messages/${id}`, data).then(r => r.data),
  review: (propertyId: string, id: string, data: { decision: string; rejectionNote?: string }) =>
    apiClient.post(`/properties/${propertyId}/board-messages/${id}/review`, data).then(r => r.data),
  publish: (propertyId: string, id: string) =>
    apiClient.post(`/properties/${propertyId}/board-messages/${id}/publish`).then(r => r.data),
  archive: (propertyId: string, id: string) =>
    apiClient.post(`/properties/${propertyId}/board-messages/${id}/archive`).then(r => r.data),
  remove: (propertyId: string, id: string) =>
    apiClient.delete(`/properties/${propertyId}/board-messages/${id}`),
  readStats: (propertyId: string, id: string) =>
    apiClient.get(`/properties/${propertyId}/board-messages/${id}/read-stats`).then(r => r.data),

  // Portal
  portalFeed: () =>
    apiClient.get('/portal/board-messages').then(r => r.data),
  portalCreate: (data: Record<string, unknown>) =>
    apiClient.post('/portal/board-messages', data).then(r => r.data),
  portalMarkRead: (id: string) =>
    apiClient.post(`/portal/board-messages/${id}/read`).then(r => r.data),
}
