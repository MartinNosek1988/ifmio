import { useQuery } from '@tanstack/react-query'
import { debtorsApi } from './debtors.api'

export const debtorKeys = {
  debtors: (propertyId: string) => ['debtors', propertyId] as const,
  stats: (propertyId: string) => ['debtors', 'stats', propertyId] as const,
  aging: (accountId: string) => ['debtors', 'aging', accountId] as const,
}

export function usePropertyDebtors(propertyId: string | undefined, options?: { minAmount?: number; sortBy?: string }) {
  return useQuery({
    queryKey: [...debtorKeys.debtors(propertyId ?? ''), options],
    queryFn: () => debtorsApi.getPropertyDebtors(propertyId!, options),
    enabled: !!propertyId,
  })
}

export function useDebtorStats(propertyId: string | undefined) {
  return useQuery({
    queryKey: debtorKeys.stats(propertyId ?? ''),
    queryFn: () => debtorsApi.getDebtorStats(propertyId!),
    enabled: !!propertyId,
  })
}

export function useAccountAging(accountId: string | undefined) {
  return useQuery({
    queryKey: debtorKeys.aging(accountId ?? ''),
    queryFn: () => debtorsApi.getAccountAging(accountId!),
    enabled: !!accountId,
  })
}
