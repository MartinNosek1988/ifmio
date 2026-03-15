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
    get:      () => apiClient.get('/mio/config').then((r) => r.data),
    meta:     () => apiClient.get('/mio/config/meta').then((r) => r.data),
    defaults: () => apiClient.get('/mio/config/defaults').then((r) => r.data),
    update:   (dto: any) => apiClient.put('/mio/config', dto).then((r) => r.data),
    reset:    (section?: string) => apiClient.post('/mio/config/reset', { section }).then((r) => r.data),
  },

  mioDigestPrefs: {
    get:     () => apiClient.get('/mio/digest/preferences').then((r) => r.data),
    update:  (dto: any) => apiClient.put('/mio/digest/preferences', dto).then((r) => r.data),
    reset:   () => apiClient.delete('/mio/digest/preferences').then((r) => r.data),
    status:  () => apiClient.get('/mio/digest/status').then((r) => r.data),
    history: () => apiClient.get('/mio/digest/history').then((r) => r.data),
    preview: () => apiClient.get('/mio/digest/preview').then((r) => r.data),
  },

  mioWebhooks: {
    list:       () => apiClient.get('/mio/webhooks').then((r) => r.data),
    create:     (dto: any) => apiClient.post('/mio/webhooks', dto).then((r) => r.data),
    update:     (id: string, dto: any) => apiClient.put(`/mio/webhooks/${id}`, dto).then((r) => r.data),
    remove:     (id: string) => apiClient.delete(`/mio/webhooks/${id}`).then((r) => r.data),
    deliveries: (id: string) => apiClient.get(`/mio/webhooks/${id}/deliveries`).then((r) => r.data),
    test:       (id: string) => apiClient.post(`/mio/webhooks/${id}/test`).then((r) => r.data),
    eventTypes: () => apiClient.get('/mio/webhooks/event-types').then((r) => r.data),
  },

  mioAdmin: {
    overview: () => apiClient.get('/mio/admin/overview').then((r) => r.data),
    jobs:     () => apiClient.get('/mio/admin/jobs').then((r) => r.data),
    digests:  (days = 7) => apiClient.get(`/mio/admin/digests?days=${days}`).then((r) => r.data),
    failures: () => apiClient.get('/mio/admin/failures').then((r) => r.data),
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
