import { apiClient } from '../../../core/api/client';

export type DocCategory = 'contract' | 'invoice' | 'protocol' | 'photo' | 'plan' | 'regulation' | 'other';

export interface ApiDocumentTag {
  id: string;
  documentId: string;
  tag: string;
}

export interface ApiDocumentLink {
  id: string;
  documentId: string;
  entityType: string;
  entityId: string;
}

export interface ApiDocument {
  id: string;
  tenantId: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageType: string;
  category: DocCategory;
  description: string | null;
  isPublic: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  tags: ApiDocumentTag[];
  links: ApiDocumentLink[];
  createdBy?: { id: string; name: string } | null;
}

export interface DocListResponse {
  data: ApiDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocStats {
  total: number;
  contract: number;
  invoice: number;
  protocol: number;
  photo: number;
  plan: number;
  regulation: number;
}

export const documentsApi = {
  list: async (params?: { category?: string; search?: string; tag?: string; propertyId?: string; entityType?: string; entityId?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get<DocListResponse>('/documents', { params });
    return data;
  },

  stats: async () => {
    const { data } = await apiClient.get<DocStats>('/documents/stats');
    return data;
  },

  upload: async (file: File, meta: {
    name?: string;
    category?: string;
    description?: string;
    tags?: string[];
    entityType?: string;
    entityId?: string;
  }) => {
    const form = new FormData();
    form.append('file', file);
    if (meta.name) form.append('name', meta.name);
    if (meta.category) form.append('category', meta.category);
    if (meta.description) form.append('description', meta.description);
    if (meta.tags?.length) form.append('tags', JSON.stringify(meta.tags));
    if (meta.entityType) form.append('entityType', meta.entityType);
    if (meta.entityId) form.append('entityId', meta.entityId);
    const { data } = await apiClient.post<ApiDocument>('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/documents/${id}`);
  },

  addLink: async (id: string, entityType: string, entityId: string) => {
    const { data } = await apiClient.post<ApiDocumentLink>(`/documents/${id}/links`, { entityType, entityId });
    return data;
  },

  downloadUrl: (id: string) =>
    `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'}/documents/${id}/download`,
};

export function formatFileSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
