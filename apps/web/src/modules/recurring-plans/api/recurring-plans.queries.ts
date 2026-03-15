import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recurringPlansApi, type CreateRecurringPlanDto } from './recurring-plans.api'

export const rpKeys = {
  all: ['recurring-plans'] as const,
  list: (params?: Record<string, string>) => ['recurring-plans', 'list', params] as const,
  detail: (id: string) => ['recurring-plans', 'detail', id] as const,
}

export function useRecurringPlans(params?: { assetId?: string; isActive?: string }) {
  return useQuery({
    queryKey: rpKeys.list(params as Record<string, string>),
    queryFn: () => recurringPlansApi.list(params),
  })
}

export function useCreateRecurringPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateRecurringPlanDto) => recurringPlansApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: rpKeys.all }),
  })
}

export function useUpdateRecurringPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateRecurringPlanDto> & { isActive?: boolean } }) =>
      recurringPlansApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: rpKeys.all }),
  })
}

export function useDeleteRecurringPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recurringPlansApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: rpKeys.all }),
  })
}
