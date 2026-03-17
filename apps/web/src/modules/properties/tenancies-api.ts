import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'

export interface ApiTenancy {
  id: string
  tenantId: string
  unitId: string
  partyId: string
  type: string
  role: string
  contractNo: string | null
  validFrom: string | null
  validTo: string | null
  moveInDate: string | null
  moveOutDate: string | null
  rentAmount: number | null
  serviceAdvanceAmount: number | null
  depositAmount: number | null
  isActive: boolean
  note: string | null
  createdAt: string
  party: { id: string; displayName: string; type: string; phone: string | null; email: string | null }
  unit?: { id: string; name: string; property?: { id: string; name: string } }
}

export const tenanciesApi = {
  findByUnit: (unitId: string) =>
    apiClient.get<ApiTenancy[]>(`/tenancies/unit/${unitId}`).then(r => r.data),
  findByProperty: (propertyId: string, includeInactive = false) =>
    apiClient.get<ApiTenancy[]>(`/tenancies/property/${propertyId}`, { params: { includeInactive } }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiTenancy>('/tenancies', data).then(r => r.data),
  terminate: (id: string, moveOutDate: string) =>
    apiClient.post<ApiTenancy>(`/tenancies/${id}/terminate`, { moveOutDate }).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/tenancies/${id}`),
}

export function useUnitTenancies(unitId: string) {
  return useQuery({
    queryKey: ['tenancies', 'unit', unitId],
    queryFn: () => tenanciesApi.findByUnit(unitId),
    enabled: !!unitId,
  })
}

export function usePropertyTenancies(propertyId: string) {
  return useQuery({
    queryKey: ['tenancies', 'property', propertyId],
    queryFn: () => tenanciesApi.findByProperty(propertyId),
    enabled: !!propertyId,
  })
}

export function useCreateTenancy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => tenanciesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenancies'] }),
  })
}

export function useTerminateTenancy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, moveOutDate }: { id: string; moveOutDate: string }) =>
      tenanciesApi.terminate(id, moveOutDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenancies'] }),
  })
}
