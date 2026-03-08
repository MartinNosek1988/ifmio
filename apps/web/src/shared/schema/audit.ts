import type { BaseEntity } from './base';

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout';

export interface AuditLog extends BaseEntity {
  user_id?: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  changes?: Record<string, { before: unknown; after: unknown }>;
  ip_address?: string;
  user_agent?: string;
}
