import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { initialBalancesApi } from './initial-balances.api'

export const ibKeys = {
  property: (propertyId: string) => ['initial-balances', propertyId] as const,
}

export function usePropertyInitialBalances(propertyId: string | undefined) {
  return useQuery({
    queryKey: ibKeys.property(propertyId ?? ''),
    queryFn: () => initialBalancesApi.getPropertyInitialBalances(propertyId!),
    enabled: !!propertyId,
  })
}

function invalidateIB(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['initial-balances'] })
  qc.invalidateQueries({ queryKey: ['konto'] })
  qc.invalidateQueries({ queryKey: ['debtors'] })
}

export function useBulkSetOwnerBalances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      propertyId: string; cutoverDate: string;
      items: Array<{ unitId: string; residentId: string; amount: number; note?: string }>
    }) => initialBalancesApi.bulkSetOwnerBalances(dto),
    onSuccess: () => invalidateIB(qc),
  })
}

export function useSetBankBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      propertyId: string; bankAccountId: string;
      amount: number; cutoverDate: string; note?: string
    }) => initialBalancesApi.setBankBalance(dto),
    onSuccess: () => invalidateIB(qc),
  })
}

export function useSetFundBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      propertyId: string; componentId: string;
      amount: number; cutoverDate: string; note?: string
    }) => initialBalancesApi.setFundBalance(dto),
    onSuccess: () => invalidateIB(qc),
  })
}

export function useSetDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      propertyId: string; unitId: string; residentId: string;
      amount: number; cutoverDate: string; note?: string
    }) => initialBalancesApi.setDeposit(dto),
    onSuccess: () => invalidateIB(qc),
  })
}

export function useSetMeterReading() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      propertyId: string; meterId: string;
      value: number; cutoverDate: string; note?: string
    }) => initialBalancesApi.setMeterReading(dto),
    onSuccess: () => invalidateIB(qc),
  })
}

export function useDeleteInitialBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => initialBalancesApi.deleteInitialBalance(id),
    onSuccess: () => invalidateIB(qc),
  })
}
