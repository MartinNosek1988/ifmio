import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../core/api/client'
import type { PerRollamVoting, PerRollamBallot, PerRollamProgress } from './perRollamTypes'

const keys = {
  all: ['per-rollam'] as const,
  list: (propertyId?: string) => ['per-rollam', 'list', propertyId] as const,
  detail: (id: string) => ['per-rollam', 'detail', id] as const,
  ballots: (id: string) => ['per-rollam', 'ballots', id] as const,
  progress: (id: string) => ['per-rollam', 'progress', id] as const,
  ballot: (token: string) => ['per-rollam', 'ballot', token] as const,
}

export function usePerRollamList(propertyId?: string) {
  return useQuery({
    queryKey: keys.list(propertyId),
    queryFn: () => apiClient.get<PerRollamVoting[]>('/per-rollam', { params: { propertyId } }).then(r => r.data),
    enabled: !!propertyId,
  })
}

export function usePerRollam(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => apiClient.get<PerRollamVoting>(`/per-rollam/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreatePerRollam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post<PerRollamVoting>('/per-rollam', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.all }) },
  })
}

export function useUpdatePerRollam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.patch<PerRollamVoting>(`/per-rollam/${id}`, data).then(r => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useDeletePerRollam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/per-rollam/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.all }) },
  })
}

export function usePerRollamTransition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'close' | 'evaluate' | 'notify-results' | 'cancel' }) =>
      apiClient.post(`/per-rollam/${id}/${action}`).then(r => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.all })
      qc.invalidateQueries({ queryKey: keys.ballots(id) })
      qc.invalidateQueries({ queryKey: keys.progress(id) })
    },
  })
}

export function useAddPerRollamItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ votingId, data }: { votingId: string; data: Record<string, unknown> }) =>
      apiClient.post(`/per-rollam/${votingId}/items`, data).then(r => r.data),
    onSuccess: (_, { votingId }) => { qc.invalidateQueries({ queryKey: keys.detail(votingId) }) },
  })
}

export function usePerRollamBallots(votingId: string) {
  return useQuery({
    queryKey: keys.ballots(votingId),
    queryFn: () => apiClient.get<PerRollamBallot[]>(`/per-rollam/${votingId}/ballots`).then(r => r.data),
    enabled: !!votingId,
  })
}

export function usePerRollamProgress(votingId: string) {
  return useQuery({
    queryKey: keys.progress(votingId),
    queryFn: () => apiClient.get<PerRollamProgress>(`/per-rollam/${votingId}/progress`).then(r => r.data),
    enabled: !!votingId,
    refetchInterval: 30_000,
  })
}

export function useManualBallotEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ votingId, ballotId, votes }: { votingId: string; ballotId: string; votes: { itemId: string; choice: string }[] }) =>
      apiClient.post(`/per-rollam/${votingId}/ballots/${ballotId}/manual-entry`, { votes }).then(r => r.data),
    onSuccess: (_, { votingId }) => {
      qc.invalidateQueries({ queryKey: keys.ballots(votingId) })
      qc.invalidateQueries({ queryKey: keys.progress(votingId) })
    },
  })
}

// Public ballot (no auth)
export function usePublicBallot(accessToken: string) {
  return useQuery({
    queryKey: keys.ballot(accessToken),
    queryFn: () => apiClient.get(`/per-rollam/ballot/${accessToken}`).then(r => r.data),
    enabled: !!accessToken,
    retry: false,
  })
}

export function useSubmitPublicBallot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accessToken, votes }: { accessToken: string; votes: { itemId: string; choice: string }[] }) =>
      apiClient.post(`/per-rollam/ballot/${accessToken}/submit`, { votes }).then(r => r.data),
    onSuccess: (_, { accessToken }) => {
      qc.invalidateQueries({ queryKey: keys.ballot(accessToken) })
    },
  })
}
