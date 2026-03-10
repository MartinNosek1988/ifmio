import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from './admin.api'

export const adminKeys = {
  tenant:   () => ['admin', 'tenant']   as const,
  settings: () => ['admin', 'settings'] as const,
  users:    () => ['admin', 'users']    as const,
}

export function useTenantInfo() {
  return useQuery({
    queryKey: adminKeys.tenant(),
    queryFn:  () => adminApi.tenant(),
  })
}

export function useTenantSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn:  () => adminApi.settings.get(),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => adminApi.settings.update(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: adminKeys.settings() }),
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn:  () => adminApi.users.list(),
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => adminApi.users.invite(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.users.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name?: string; role?: string; isActive?: boolean } }) =>
      adminApi.users.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.users.deactivate(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  })
}
