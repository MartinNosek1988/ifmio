import { apiClient } from '../../../core/api/client'

export const kanbanApi = {
  getBoard: (params?: Record<string, string>) =>
    apiClient.get('/kanban/board', { params }).then(r => r.data),
  createTask: (data: Record<string, unknown>) =>
    apiClient.post('/kanban/tasks', data).then(r => r.data),
  updateTask: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/kanban/tasks/${id}`, data).then(r => r.data),
  deleteTask: (id: string) =>
    apiClient.delete(`/kanban/tasks/${id}`),
  moveCard: (data: { cardId: string; source: string; sourceId: string; newStatus: string; newOrder?: number }) =>
    apiClient.put('/kanban/move', data).then(r => r.data),
  getStats: () =>
    apiClient.get('/kanban/stats').then(r => r.data),
}
