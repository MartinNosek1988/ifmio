import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'

export interface ApiOwnership {
  id: string
  tenantId: string
  propertyId?: string
  unitId?: string
  partyId: string
  role: string
  shareNumerator: number | null
  shareDenominator: number | null
  sharePercent: number | null
  validFrom: string | null
  validTo: string | null
  isActive: boolean
  note: string | null
  createdAt: string
  party: { id: string; displayName: string; type: string; ic: string | null; email: string | null }
  unit?: { id: string; name: string }
}

export const ownershipsApi = {
  getPropertyOwnerships: (propertyId: string) =>
    apiClient.get<ApiOwnership[]>(`/ownerships/property/${propertyId}`).then(r => r.data),
  getUnitOwnerships: (unitId: string) =>
    apiClient.get<ApiOwnership[]>(`/ownerships/unit/${unitId}`).then(r => r.data),
  getUnitOwnershipsByProperty: (propertyId: string) =>
    apiClient.get<ApiOwnership[]>(`/ownerships/units-by-property/${propertyId}`).then(r => r.data),
  createPropertyOwnership: (data: Record<string, unknown>) =>
    apiClient.post<ApiOwnership>('/ownerships/property', data).then(r => r.data),
  createUnitOwnership: (data: Record<string, unknown>) =>
    apiClient.post<ApiOwnership>('/ownerships/unit', data).then(r => r.data),
  removePropertyOwnership: (id: string) =>
    apiClient.delete(`/ownerships/property/${id}`),
  removeUnitOwnership: (id: string) =>
    apiClient.delete(`/ownerships/unit/${id}`),
}

export function usePropertyOwnerships(propertyId: string) {
  return useQuery({
    queryKey: ['ownerships', 'property', propertyId],
    queryFn: () => ownershipsApi.getPropertyOwnerships(propertyId),
    enabled: !!propertyId,
  })
}

export function useUnitOwnerships(unitId: string) {
  return useQuery({
    queryKey: ['ownerships', 'unit', unitId],
    queryFn: () => ownershipsApi.getUnitOwnerships(unitId),
    enabled: !!unitId,
  })
}

export function useUnitOwnershipsByProperty(propertyId: string) {
  return useQuery({
    queryKey: ['ownerships', 'units-by-property', propertyId],
    queryFn: () => ownershipsApi.getUnitOwnershipsByProperty(propertyId),
    enabled: !!propertyId,
  })
}

export function useCreateUnitOwnership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => ownershipsApi.createUnitOwnership(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ownerships'] }),
  })
}

export function useCreatePropertyOwnership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => ownershipsApi.createPropertyOwnership(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ownerships'] }),
  })
}
