import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { partiesApi } from './parties.api'

export const partyKeys = {
  all: ['parties'] as const,
  list: (params?: Record<string, unknown>) => [...partyKeys.all, 'list', params] as const,
  detail: (id: string) => [...partyKeys.all, 'detail', id] as const,
}

export function useParties(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: partyKeys.list(params),
    queryFn: () => partiesApi.list(params),
  })
}

export function useParty(id: string) {
  return useQuery({
    queryKey: partyKeys.detail(id),
    queryFn: () => partiesApi.getOne(id),
    enabled: !!id,
  })
}

export function useCreateParty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => partiesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: partyKeys.all }),
  })
}

export function useUpdateParty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => partiesApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: partyKeys.all })
      qc.invalidateQueries({ queryKey: partyKeys.detail(id) })
    },
  })
}

export function useDeleteParty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => partiesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: partyKeys.all }),
  })
}
