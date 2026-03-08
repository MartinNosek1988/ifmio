import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { helpdeskApi } from './helpdesk.api'

export const helpdeskKeys = {
  list:     (p?: any)      => ['helpdesk', 'list', p]       as const,
  detail:   (id: string)   => ['helpdesk', 'detail', id]    as const,
  protocol: (id: string)   => ['helpdesk', 'protocol', id]  as const,
}

export function useTickets(params?: any) {
  return useQuery({
    queryKey: helpdeskKeys.list(params),
    queryFn:  () => helpdeskApi.list(params),
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: helpdeskKeys.detail(id),
    queryFn:  () => helpdeskApi.detail(id),
    enabled:  !!id,
  })
}

export function useTicketProtocol(ticketId: string) {
  return useQuery({
    queryKey: helpdeskKeys.protocol(ticketId),
    queryFn:  () => helpdeskApi.protocol.get(ticketId),
    enabled:  !!ticketId,
    retry:    false,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => helpdeskApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['helpdesk', 'list'] }),
  })
}

export function useUpdateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) =>
      helpdeskApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['helpdesk', 'list'] })
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(id) })
    },
  })
}

export function useAddTicketItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, dto }: { ticketId: string; dto: any }) =>
      helpdeskApi.items.add(ticketId, dto),
    onSuccess: (_, { ticketId }) =>
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(ticketId) }),
  })
}

export function useSaveProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, dto }: { ticketId: string; dto: any }) =>
      helpdeskApi.protocol.save(ticketId, dto),
    onSuccess: (_, { ticketId }) => {
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(ticketId) })
      qc.invalidateQueries({ queryKey: helpdeskKeys.protocol(ticketId) })
    },
  })
}
