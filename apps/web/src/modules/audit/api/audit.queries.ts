import { useQuery } from '@tanstack/react-query';
import { auditApi } from './audit.api';
import type { AuditFilters } from './audit.api';

export const auditKeys = {
  all: ['audit'] as const,
  list: (f: AuditFilters) => ['audit', 'list', f] as const,
  entities: () => ['audit', 'entities'] as const,
};

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => auditApi.list(filters),
  });
}

export function useAuditEntities() {
  return useQuery({
    queryKey: auditKeys.entities(),
    queryFn: () => auditApi.entities(),
  });
}
