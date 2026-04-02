import { useAuthStore } from '../../core/auth/auth.store'

/** Backend roles from Prisma UserRole enum */
export type AppRole =
  | 'tenant_owner'
  | 'tenant_admin'
  | 'finance_manager'
  | 'property_manager'
  | 'operations'
  | 'viewer'
  | 'unit_owner'
  | 'unit_tenant'

interface UsePermissionOptions {
  /** Whitelist — allow ONLY these roles */
  allow?: AppRole[]
  /** Blacklist — deny these roles */
  deny?: AppRole[]
}

interface UsePermissionResult {
  hasPermission: boolean
  currentRole: AppRole | null
  isLoading: boolean
}

/**
 * Checks if the current user's role matches the permission criteria.
 *
 * - If both allow and deny are empty → hasPermission = true (all access)
 * - If allow is set → user must have one of the listed roles
 * - If deny is set → user must NOT have any of the listed roles
 */
export function usePermission(options: UsePermissionOptions = {}): UsePermissionResult {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const { allow, deny } = options

  if (isLoading) return { hasPermission: false, currentRole: null, isLoading: true }
  if (!user) return { hasPermission: false, currentRole: null, isLoading: false }

  const currentRole = (user.role as AppRole) ?? null

  // If no restrictions → all access
  if ((!allow || allow.length === 0) && (!deny || deny.length === 0)) {
    return { hasPermission: true, currentRole, isLoading: false }
  }

  // Deny list takes priority
  if (deny && deny.length > 0 && deny.includes(currentRole)) {
    return { hasPermission: false, currentRole, isLoading: false }
  }

  // Allow list
  if (allow && allow.length > 0) {
    return { hasPermission: allow.includes(currentRole), currentRole, isLoading: false }
  }

  return { hasPermission: true, currentRole, isLoading: false }
}
