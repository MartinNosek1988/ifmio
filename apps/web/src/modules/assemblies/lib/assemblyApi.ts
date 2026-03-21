import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../core/api/client'
import type { Assembly, Attendee, Vote, QuorumStatus, VoteEvaluation } from './assemblyTypes'

const keys = {
  all: ['assemblies'] as const,
  list: (propertyId?: string) => ['assemblies', 'list', propertyId] as const,
  detail: (id: string) => ['assemblies', 'detail', id] as const,
  attendees: (id: string) => ['assemblies', 'attendees', id] as const,
  quorum: (id: string) => ['assemblies', 'quorum', id] as const,
  votes: (assemblyId: string, itemId: string) => ['assemblies', 'votes', assemblyId, itemId] as const,
}

// ─── Assembly CRUD ───────────────────────────────────────────────

export function useAssemblies(propertyId?: string) {
  return useQuery({
    queryKey: keys.list(propertyId),
    queryFn: () => apiClient.get<Assembly[]>('/assemblies', { params: { propertyId } }).then(r => r.data),
    enabled: !!propertyId,
  })
}

export function useAssembly(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => apiClient.get<Assembly>(`/assemblies/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateAssembly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post<Assembly>('/assemblies', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.all }) },
  })
}

export function useUpdateAssembly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.patch<Assembly>(`/assemblies/${id}`, data).then(r => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useDeleteAssembly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assemblies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.all }) },
  })
}

// ─── Status transitions ─────────────────────────────────────────

export function useAssemblyTransition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'start' | 'complete' | 'cancel' }) =>
      apiClient.post(`/assemblies/${id}/${action}`).then(r => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

// ─── Agenda items ────────────────────────────────────────────────

export function useAddAgendaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assemblyId, data }: { assemblyId: string; data: Record<string, unknown> }) =>
      apiClient.post(`/assemblies/${assemblyId}/agenda-items`, data).then(r => r.data),
    onSuccess: (_, { assemblyId }) => { qc.invalidateQueries({ queryKey: keys.detail(assemblyId) }) },
  })
}

export function useUpdateAgendaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assemblyId, itemId, data }: { assemblyId: string; itemId: string; data: Record<string, unknown> }) =>
      apiClient.patch(`/assemblies/${assemblyId}/agenda-items/${itemId}`, data).then(r => r.data),
    onSuccess: (_, { assemblyId }) => { qc.invalidateQueries({ queryKey: keys.detail(assemblyId) }) },
  })
}

export function useDeleteAgendaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assemblyId, itemId }: { assemblyId: string; itemId: string }) =>
      apiClient.delete(`/assemblies/${assemblyId}/agenda-items/${itemId}`),
    onSuccess: (_, { assemblyId }) => { qc.invalidateQueries({ queryKey: keys.detail(assemblyId) }) },
  })
}

// ─── Attendance ──────────────────────────────────────────────────

export function useAttendees(assemblyId: string) {
  return useQuery({
    queryKey: keys.attendees(assemblyId),
    queryFn: () => apiClient.get<Attendee[]>(`/assemblies/${assemblyId}/attendees`).then(r => r.data),
    enabled: !!assemblyId,
  })
}

export function usePopulateAttendees() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assemblyId: string) => apiClient.post(`/assemblies/${assemblyId}/attendees/populate`).then(r => r.data),
    onSuccess: (_, assemblyId) => {
      qc.invalidateQueries({ queryKey: keys.attendees(assemblyId) })
      qc.invalidateQueries({ queryKey: keys.detail(assemblyId) })
      qc.invalidateQueries({ queryKey: keys.quorum(assemblyId) })
    },
  })
}

export function useUpdateAttendee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assemblyId, attendeeId, data }: { assemblyId: string; attendeeId: string; data: Record<string, unknown> }) =>
      apiClient.patch(`/assemblies/${assemblyId}/attendees/${attendeeId}`, data).then(r => r.data),
    onSuccess: (_, { assemblyId }) => {
      qc.invalidateQueries({ queryKey: keys.attendees(assemblyId) })
      qc.invalidateQueries({ queryKey: keys.quorum(assemblyId) })
    },
  })
}

// ─── Quorum ──────────────────────────────────────────────────────

export function useQuorum(assemblyId: string) {
  return useQuery({
    queryKey: keys.quorum(assemblyId),
    queryFn: () => apiClient.get<QuorumStatus>(`/assemblies/${assemblyId}/quorum`).then(r => r.data),
    enabled: !!assemblyId,
  })
}

// ─── Voting ──────────────────────────────────────────────────────

export function useVotes(assemblyId: string, itemId: string) {
  return useQuery({
    queryKey: keys.votes(assemblyId, itemId),
    queryFn: () => apiClient.get<Vote[]>(`/assemblies/${assemblyId}/agenda-items/${itemId}/votes`).then(r => r.data),
    enabled: !!assemblyId && !!itemId,
  })
}

export function useRecordVotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assemblyId, itemId, votes }: { assemblyId: string; itemId: string; votes: { attendeeId: string; choice: string }[] }) =>
      apiClient.post(`/assemblies/${assemblyId}/agenda-items/${itemId}/votes`, { votes }).then(r => r.data),
    onSuccess: (_, { assemblyId, itemId }) => {
      qc.invalidateQueries({ queryKey: keys.votes(assemblyId, itemId) })
      qc.invalidateQueries({ queryKey: keys.detail(assemblyId) })
    },
  })
}

export function useEvaluateVote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assemblyId, itemId }: { assemblyId: string; itemId: string }) =>
      apiClient.post<VoteEvaluation>(`/assemblies/${assemblyId}/agenda-items/${itemId}/evaluate`).then(r => r.data),
    onSuccess: (_, { assemblyId }) => { qc.invalidateQueries({ queryKey: keys.detail(assemblyId) }) },
  })
}
