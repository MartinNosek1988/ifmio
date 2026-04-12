import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { helpdeskApi } from './helpdesk.api'
import type { CreateTicketPayload, UpdateTicketPayload, CreateItemPayload, UpsertSlaPolicyPayload } from './helpdesk.api'
import { usePropertyPickerStore } from '../../../core/stores/property-picker.store'

export const helpdeskKeys = {
  all:      ['helpdesk'] as const,
  lists:    () => ['helpdesk', 'list'] as const,
  list:     (p?: Record<string, unknown>) => ['helpdesk', 'list', p] as const,
  detail:   (id: string) => ['helpdesk', 'detail', id] as const,
  protocol: (id: string) => ['helpdesk', 'protocol', id] as const,
  slaStats: () => ['helpdesk', 'sla-stats'] as const,
  dashboard: (days: number) => ['helpdesk', 'dashboard', days] as const,
  slaPolicies: () => ['helpdesk', 'sla-policies'] as const,
}

export function useTickets(params?: Record<string, unknown>) {
  const pid = usePropertyPickerStore((s) => s.selectedPropertyId)
  const scoped = pid ? { ...params, propertyId: pid } : params
  return useQuery({
    queryKey: [...helpdeskKeys.list(params), pid] as const,
    queryFn:  () => helpdeskApi.list(scoped),
  })
}

export function useSlaStats() {
  const pid = usePropertyPickerStore((s) => s.selectedPropertyId)
  return useQuery({
    queryKey: [...helpdeskKeys.slaStats(), pid] as const,
    queryFn:  () => helpdeskApi.slaStats(pid ?? undefined),
  })
}

export function useDashboard(days = 30) {
  const pid = usePropertyPickerStore((s) => s.selectedPropertyId)
  return useQuery({
    queryKey: [...helpdeskKeys.dashboard(days), pid] as const,
    queryFn:  () => helpdeskApi.dashboard(days, pid ?? undefined),
    staleTime: 60_000,
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
    onMutate: async ({ id, dto }) => {
      await qc.cancelQueries({ queryKey: helpdeskKeys.lists() })
      await qc.cancelQueries({ queryKey: helpdeskKeys.detail(id) })
      const previousDetail = qc.getQueryData(helpdeskKeys.detail(id))
      if (previousDetail) {
        qc.setQueryData(helpdeskKeys.detail(id), (old: Record<string, unknown> | undefined) =>
          old ? { ...old, ...dto } : old,
        )
      }
      return { previousDetail }
    },
    onError: (_err, { id }, context) => {
      if (context?.previousDetail) {
        qc.setQueryData(helpdeskKeys.detail(id), context.previousDetail)
      }
    },
    onSettled: (_, _err, { id }) => {
      qc.invalidateQueries({ queryKey: helpdeskKeys.lists() })
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(id) })
    },
  })
}

export function useAssignTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) =>
      helpdeskApi.assign(id, assigneeId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: helpdeskKeys.lists() })
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(id) })
    },
  })
}

export function useClaimTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => helpdeskApi.claim(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: helpdeskKeys.lists() })
      qc.invalidateQueries({ queryKey: helpdeskKeys.detail(id) })
    },
  })
}

export function useResolveTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => helpdeskApi.resolve(id),
    onSuccess: (_, id) => {
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

// SLA Policies
export function useSlaPolicies() {
  return useQuery({
    queryKey: helpdeskKeys.slaPolicies(),
    queryFn:  () => helpdeskApi.slaPolicies.list(),
  })
}

export function useUpsertSlaPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertSlaPolicyPayload) => helpdeskApi.slaPolicies.upsert(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: helpdeskKeys.slaPolicies() }),
  })
}

export function useDeleteSlaPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => helpdeskApi.slaPolicies.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: helpdeskKeys.slaPolicies() }),
  })
}
