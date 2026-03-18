import { useAuthStore } from '../../core/auth/auth.store';

/** Simplified UX-level role categories */
export type UXRole = 'fm' | 'tech' | 'owner' | 'client' | 'resident';

const FM_ROLES = ['tenant_owner', 'tenant_admin', 'property_manager'];
const TECH_ROLES = ['operations'];
const OWNER_ROLES = ['viewer', 'finance_manager'];
const CLIENT_ROLES = ['unit_owner', 'unit_tenant'];

/**
 * Maps the concrete backend role to a UX role category that drives
 * dashboard emphasis, navigation visibility and quick-action sets.
 *
 * fm       – FM správce  (tenant_owner / tenant_admin / property_manager)
 * tech     – Technik     (operations)
 * owner    – Vlastník    (viewer / finance_manager)
 * resident – Nájemce     (resident or any unknown role)
 */
export function useRoleUX(): UXRole {
  const role = useAuthStore((s) => s.user?.role ?? '');
  if (FM_ROLES.includes(role)) return 'fm';
  if (TECH_ROLES.includes(role)) return 'tech';
  if (OWNER_ROLES.includes(role)) return 'owner';
  if (CLIENT_ROLES.includes(role)) return 'client';
  return 'resident';
}

export const UX_ROLE_LABEL: Record<UXRole, string> = {
  fm: 'FM správce',
  tech: 'Technik',
  owner: 'Vlastník / klient',
  client: 'Klient portálu',
  resident: 'Nájemce',
};
