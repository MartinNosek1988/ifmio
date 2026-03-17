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
  _count: { units: number }
}

export const managementContractsApi = {
  getByProperty: (propertyId: string) =>
    apiClient.get<ApiManagementContract[]>(`/management-contracts/by-property/${propertyId}`).then(r => r.data),
}

export function usePropertyContracts(propertyId: string) {
  return useQuery({
    queryKey: ['management-contracts', 'by-property', propertyId],
    queryFn: () => managementContractsApi.getByProperty(propertyId),
    enabled: !!propertyId,
  })
}
