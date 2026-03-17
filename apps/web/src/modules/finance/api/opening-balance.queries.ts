import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { openingBalanceApi } from './opening-balance.api'

export function useOpeningBalanceStatus(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['opening-balance-status', propertyId],
    queryFn: () => openingBalanceApi.getStatus(propertyId!),
    enabled: !!propertyId,
  })
}

export function useSetBulkOpeningBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: openingBalanceApi.setBulk,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opening-balance-status'] })
      qc.invalidateQueries({ queryKey: ['konto'] })
    },
  })
}
