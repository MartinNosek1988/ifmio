import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { helpdeskApi } from './helpdesk.api'
import type { CreateTicketPayload, UpdateTicketPayload, CreateItemPayload } from './helpdesk.api'

export const helpdeskKeys = {
  all:      ['helpdesk'] as const,
  lists:    () => ['helpdesk', 'list'] as const,
  list:     (p?: Record<string, unknown>) => ['helpdesk', 'list', p] as const,
  detail:   (id: string) => ['helpdesk', 'detail', id] as const,
  protocol: (id: string) => ['helpdesk', 'protocol', id] as const,
  slaStats: () => ['helpdesk', 'sla-stats'] as const,
}

export function useTickets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: helpdeskKeys.list(params),
    queryFn:  () => helpdeskApi.list(params),
  })
}

export function useSlaStats() {
  return useQuery({
    queryKey: helpdeskKeys.slaStats(),
    queryFn:  () => helpdeskApi.slaStats(),
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
    mutationFn: (dto: CreateTicketPayload) => helpdeskApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: helpdeskKeys.lists() }),
  })
}

export function useUpdateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTicketPayload }) =>
      helpdeskApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: helpdeskKeys.lists() })
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(id) })
    },
  })
}

export function useDeleteTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => helpdeskApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: helpdeskKeys.lists() }),
  })
}

export function useAddTicketItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, dto }: { ticketId: string; dto: CreateItemPayload }) =>
      helpdeskApi.items.add(ticketId, dto),
    onSuccess: (_, { ticketId }) =>
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(ticketId) }),
  })
}

export function useRemoveTicketItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, itemId }: { ticketId: string; itemId: string }) =>
      helpdeskApi.items.remove(ticketId, itemId),
    onSuccess: (_, { ticketId }) =>
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(ticketId) }),
  })
}

export function useSaveProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, dto }: { ticketId: string; dto: Record<string, unknown> }) =>
      helpdeskApi.protocol.save(ticketId, dto),
    onSuccess: (_, { ticketId }) => {
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(ticketId) })
      qc.invalidateQueries({ queryKey: helpdeskKeys.protocol(ticketId) })
    },
  })
}
