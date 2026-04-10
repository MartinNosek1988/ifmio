import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalApi } from './portal.api'

export function useMyUnits() {
  return useQuery({ queryKey: ['portal', 'units'], queryFn: portalApi.getMyUnits })
}

export function useMyPrescriptions() {
  return useQuery({ queryKey: ['portal', 'prescriptions'], queryFn: portalApi.getMyPrescriptions })
}

export function useMySettlements() {
  return useQuery({ queryKey: ['portal', 'settlements'], queryFn: portalApi.getMySettlements })
}

export function useMyTickets() {
  return useQuery({ queryKey: ['portal', 'tickets'], queryFn: portalApi.getMyTickets })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: portalApi.createTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'tickets'] }),
  })
}

export function useMyMeters() {
  return useQuery({ queryKey: ['portal', 'meters'], queryFn: portalApi.getMyMeters })
}

export function useSubmitReading() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meterId, data }: { meterId: string; data: { value: number; readingDate: string; note?: string } }) =>
      portalApi.submitReading(meterId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'meters'] }),
  })
}

export function useMyDocuments() {
  return useQuery({ queryKey: ['portal', 'documents'], queryFn: portalApi.getMyDocuments })
}

export function useMyKonto() {
  return useQuery({ queryKey: ['portal', 'konto'], queryFn: portalApi.getMyKonto })
}

export function useMyVotings() {
  return useQuery({ queryKey: ['portal', 'votings'], queryFn: portalApi.getMyVotings })
}

export function useMyESignRequests() {
  return useQuery({ queryKey: ['portal', 'esign'], queryFn: portalApi.getMyESignRequests })
}

export function useUnitDetail(unitId: string | null) {
  return useQuery({
    queryKey: ['portal', 'unit-detail', unitId],
    queryFn: () => portalApi.getUnitDetail(unitId!),
    enabled: !!unitId,
  })
}

export function useMyMessages() {
  return useQuery({ queryKey: ['portal', 'messages'], queryFn: portalApi.getMyMessages })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: portalApi.sendMessage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages'] }),
  })
}

export function useMarkMessageRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: portalApi.markMessageRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages'] }),
  })
}
