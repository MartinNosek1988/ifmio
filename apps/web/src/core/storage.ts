let CURRENT_TENANT: { id: string } | null = null;

export function setCurrentTenant(tenant: { id: string } | null) {
  CURRENT_TENANT = tenant;
}

function _tk(key: string): string {
  return CURRENT_TENANT?.id ? `${CURRENT_TENANT.id}_${key}` : key;
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(_tk(key), JSON.stringify(data));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(_tk(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(_tk(key));
}

// --- Entity helpers (P0-2) ---

export function getCurrentTenantId(): string {
  return CURRENT_TENANT?.id || 'default';
}

export function makeEntityBase(overrides?: { id?: string; tenant_id?: string }) {
  const now = new Date().toISOString();
  return {
    id: overrides?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenant_id: overrides?.tenant_id ?? getCurrentTenantId(),
    created_at: now,
    updated_at: now,
    deleted_at: null as string | null,
  };
}

export function filterActive<T extends { deleted_at?: string | null }>(items: T[]): T[] {
  return items.filter(item => !item.deleted_at);
}
