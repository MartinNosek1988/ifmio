import { apiClient } from '../../../core/api/client'

export interface Notification {
  id: string
  tenantId: string
  userId: string | null
  type: string
  title: string
  body: string
  entityId: string | null
  entityType: string | null
  url: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export const notificationsApi = {
  list: (unreadOnly = false) =>
    apiClient
      .get<Notification[]>('/notifications', { params: { unreadOnly } })
      .then((r) => r.data),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),

  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.patch('/notifications/read-all').then((r) => r.data),
}
