import { apiClient } from '../../../core/api/client';

export interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { id: string; email: string; name: string } | null;
}

export interface AuditListResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  entity?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditApi = {
  list: (filters?: AuditFilters) =>
    apiClient
      .get<AuditListResponse>('/audit', { params: filters })
      .then((r) => r.data),

  entities: () =>
    apiClient.get<string[]>('/audit/entities').then((r) => r.data),
};
