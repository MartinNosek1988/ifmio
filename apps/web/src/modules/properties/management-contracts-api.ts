import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'

export interface ApiManagementContract {
  id: string
  tenantId: string
  principalId: string
  propertyId: string
  type: string
  scope: string
  contractNo: string | null
  name: string | null
  validFrom: string | null
  validTo: string | null
  isActive: boolean
  note: string | null
  createdAt: string
  updatedAt: string
  principal: { id: string; displayName: string }
  property?: { id: string; name: string; address: string }
  _count: { units: number }
}

export const managementContractsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<ApiManagementContract[]>('/management-contracts', { params }).then(r => r.data),
  getByProperty: (propertyId: string) =>
    apiClient.get<ApiManagementContract[]>(`/management-contracts/by-property/${propertyId}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiManagementContract>('/management-contracts', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch<ApiManagementContract>(`/management-contracts/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/management-contracts/${id}`),
}

export function useManagementContracts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['management-contracts', 'list', params],
    queryFn: () => managementContractsApi.list(params),
  })
}

export function usePropertyContracts(propertyId: string) {
  return useQuery({
    queryKey: ['management-contracts', 'by-property', propertyId],
    queryFn: () => managementContractsApi.getByProperty(propertyId),
    enabled: !!propertyId,
  })
}
