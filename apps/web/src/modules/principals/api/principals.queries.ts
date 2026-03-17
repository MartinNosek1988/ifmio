import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { principalsApi } from './principals.api'

export const principalKeys = {
  all: ['principals'] as const,
  list: (params?: Record<string, unknown>) => [...principalKeys.all, 'list', params] as const,
  detail: (id: string) => [...principalKeys.all, 'detail', id] as const,
  properties: (id: string) => [...principalKeys.all, 'properties', id] as const,
  units: (id: string) => [...principalKeys.all, 'units', id] as const,
  tenants: (id: string) => [...principalKeys.all, 'tenants', id] as const,
}

export function usePrincipals(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: principalKeys.list(params),
    queryFn: () => principalsApi.list(params),
  })
}

export function usePrincipal(id: string) {
  return useQuery({
    queryKey: principalKeys.detail(id),
    queryFn: () => principalsApi.getOne(id),
    enabled: !!id,
  })
}

export function usePrincipalProperties(id: string) {
  return useQuery({
    queryKey: principalKeys.properties(id),
    queryFn: () => principalsApi.getProperties(id),
    enabled: !!id,
  })
}

export function usePrincipalUnits(id: string) {
  return useQuery({
    queryKey: principalKeys.units(id),
    queryFn: () => principalsApi.getUnits(id),
    enabled: !!id,
  })
}

export function usePrincipalTenants(id: string) {
  return useQuery({
    queryKey: principalKeys.tenants(id),
    queryFn: () => principalsApi.getTenants(id),
    enabled: !!id,
  })
}
