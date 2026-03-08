import { apiClient } from '../../../core/api/client'

export const documentsApi = {
  list: (params?: any) =>
    apiClient.get('/documents', { params }).then((r) => r.data),

  upload: (file: File, meta: {
    name?:        string
    category?:    string
    description?: string
    tags?:        string[]
    entityType?:  string
    entityId?:    string
  }) => {
    const form = new FormData()
    form.append('file', file)
    if (meta.name)        form.append('name',        meta.name)
    if (meta.category)    form.append('category',    meta.category)
    if (meta.description) form.append('description', meta.description)
    if (meta.tags?.length) form.append('tags',       JSON.stringify(meta.tags))
    if (meta.entityType)  form.append('entityType',  meta.entityType)
    if (meta.entityId)    form.append('entityId',    meta.entityId)
    return apiClient.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  delete: (id: string) =>
    apiClient.delete(`/documents/${id}`).then((r) => r.data),

  addLink: (id: string, entityType: string, entityId: string) =>
    apiClient.post(`/documents/${id}/links`, { entityType, entityId })
      .then((r) => r.data),

  downloadUrl: (id: string) =>
    `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'}/documents/${id}/download`,
}
