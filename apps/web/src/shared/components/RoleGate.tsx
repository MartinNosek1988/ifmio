import type { ReactNode } from 'react'
import { usePermission, type AppRole } from '../hooks/usePermission'

interface RoleGateProps {
  /** Roles that CAN see the content */
  allow?: AppRole[]
  /** Roles that CANNOT see the content */
  deny?: AppRole[]
  /** What to render if the user doesn't have permission (default: nothing) */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Conditionally renders children based on the current user's role.
 * Never shows an error — just hides content silently.
 *
 * @example
 * <RoleGate allow={['tenant_owner', 'tenant_admin']}>
 *   <DeleteButton />
 * </RoleGate>
 */
export function RoleGate({ allow, deny, fallback = null, children }: RoleGateProps) {
  const { hasPermission, isLoading } = usePermission({ allow, deny })

  if (isLoading) return null
  if (!hasPermission) return <>{fallback}</>
  return <>{children}</>
}
