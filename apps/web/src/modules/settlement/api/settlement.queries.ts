import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settlementApi } from './settlement.api'

export const settlementKeys = {
  all: ['settlements'] as const,
  list: (params?: Record<string, unknown>) => [...settlementKeys.all, 'list', params] as const,
  detail: (id: string) => [...settlementKeys.all, 'detail', id] as const,
}

export function useSettlements(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: settlementKeys.list(params),
    queryFn: () => settlementApi.list(params),
  })
}

export function useSettlement(id: string) {
  return useQuery({
    queryKey: settlementKeys.detail(id),
    queryFn: () => settlementApi.getOne(id),
    enabled: !!id,
  })
}

export function useCreateSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => settlementApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: settlementKeys.all }),
  })
}

export function useAddSettlementCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => settlementApi.addCost(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: settlementKeys.all }),
  })
}

export function useCalculateSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => settlementApi.calculate(id),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: settlementKeys.detail(id) }),
  })
}

export function useApproveSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => settlementApi.approve(id),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: settlementKeys.detail(id) }),
  })
}
