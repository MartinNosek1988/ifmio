import { AsyncLocalStorage } from 'async_hooks'

interface TenantCtx {
  tenantId: string
  userId: string
}

export const tenantStore = new AsyncLocalStorage<TenantCtx>()

export function getTenantId(): string | undefined {
  return tenantStore.getStore()?.tenantId
}

export function getUserId(): string | undefined {
  return tenantStore.getStore()?.userId
}
