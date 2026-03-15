import { apiClient } from '../../../core/api/client'

export const adminApi = {
  tenant:   () =>
    apiClient.get('/admin/tenant').then((r) => r.data),

  settings: {
    get:    () =>
      apiClient.get('/admin/settings').then((r) => r.data),
    update: (dto: any) =>
      apiClient.put('/admin/settings', dto).then((r) => r.data),
    uploadLogo: (logoBase64: string) =>
      apiClient.put('/admin/settings/logo', { logoBase64 }).then((r) => r.data),
  },

  exportData: () =>
    apiClient.get('/admin/export').then((r) => r.data),

  mioConfig: {
    get:    () =>
      apiClient.get('/mio/config').then((r) => r.data),
    update: (dto: any) =>
      apiClient.put('/mio/config', dto).then((r) => r.data),
  },

  users: {
    list:       () =>
      apiClient.get('/admin/users').then((r) => r.data),
    invite:     (dto: any) =>
      apiClient.post('/admin/users', dto).then((r) => r.data),
    updateRole: (id: string, role: string) =>
      apiClient.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data),
    update:     (id: string, dto: { name?: string; role?: string; isActive?: boolean }) =>
      apiClient.patch(`/admin/users/${id}`, dto).then((r) => r.data),
    deactivate: (id: string) =>
      apiClient.delete(`/admin/users/${id}`).then((r) => r.data),
  },
}
