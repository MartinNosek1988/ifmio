/** Shared base fields for all business entities */
export interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export function createBase(tenant_id: string, id?: string): BaseEntity {
  const now = new Date().toISOString();
  return {
    id: id ?? (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    tenant_id,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

export function touchUpdated<T extends BaseEntity>(entity: T): T {
  return { ...entity, updated_at: new Date().toISOString() };
}

export function softDelete<T extends BaseEntity>(entity: T): T {
  return { ...entity, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

export function filterActive<T extends { deleted_at?: string | null }>(items: T[]): T[] {
  return items.filter(item => !item.deleted_at);
}
