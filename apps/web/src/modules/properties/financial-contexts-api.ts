import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'

export interface ApiFinancialContext {
  id: string
  tenantId: string
  scopeType: string
  displayName: string
  principalId: string | null
  propertyId: string | null
  managementContractId: string | null
  code: string | null
  currency: string
  vatEnabled: boolean
  vatPayer: boolean
  invoicePrefix: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  principal: { id: string; displayName: string } | null
  _count: { bankAccounts: number }
}

export const financialContextsApi = {
  getByProperty: (propertyId: string) =>
    apiClient.get<ApiFinancialContext[]>(`/financial-contexts/by-property/${propertyId}`).then(r => r.data),
}

export function usePropertyFinancialContexts(propertyId: string) {
  return useQuery({
    queryKey: ['financial-contexts', 'by-property', propertyId],
    queryFn: () => financialContextsApi.getByProperty(propertyId),
    enabled: !!propertyId,
  })
}
