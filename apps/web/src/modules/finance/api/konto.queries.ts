import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kontoApi } from './konto.api'

export const kontoKeys = {
  accounts: (propertyId: string) => ['konto', 'accounts', propertyId] as const,
  ledger: (accountId: string) => ['konto', 'ledger', accountId] as const,
  resident: (residentId: string, unitId: string) => ['konto', 'resident', residentId, unitId] as const,
}

export function usePropertyAccounts(propertyId: string | undefined) {
  return useQuery({
    queryKey: kontoKeys.accounts(propertyId ?? ''),
    queryFn: () => kontoApi.getPropertyAccounts(propertyId!),
    enabled: !!propertyId,
  })
}

export function useAccountLedger(accountId: string | undefined, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...kontoKeys.ledger(accountId ?? ''), page, pageSize],
    queryFn: () => kontoApi.getAccountLedger(accountId!, page, pageSize),
    enabled: !!accountId,
  })
}

export function useAccountByResident(residentId: string | undefined, unitId: string | undefined) {
  return useQuery({
    queryKey: kontoKeys.resident(residentId ?? '', unitId ?? ''),
    queryFn: () => kontoApi.getAccountByResident(residentId!, unitId!),
    enabled: !!residentId && !!unitId,
  })
}

export function useManualAdjustment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { accountId: string; data: { amount: number; type: 'DEBIT' | 'CREDIT'; description: string; date?: string } }) =>
      kontoApi.postManualAdjustment(args.accountId, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['konto'] })
    },
  })
}
