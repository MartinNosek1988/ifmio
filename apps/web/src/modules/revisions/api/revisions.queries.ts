import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { revisionsApi } from './revisions.api'
import type { CreateSubjectPayload, CreateTypePayload, CreatePlanPayload, CreateEventPayload } from './revisions.api'

export const revisionKeys = {
  all:        ['revisions'] as const,
  subjects:   () => ['revisions', 'subjects'] as const,
  subject:    (id: string) => ['revisions', 'subjects', id] as const,
  types:      () => ['revisions', 'types'] as const,
  plans:      () => ['revisions', 'plans'] as const,
  planList:   (p?: Record<string, unknown>) => ['revisions', 'plans', 'list', p] as const,
  plan:       (id: string) => ['revisions', 'plans', id] as const,
  planHistory: (id: string) => ['revisions', 'plans', id, 'history'] as const,
  events:     () => ['revisions', 'events'] as const,
  event:      (id: string) => ['revisions', 'events', id] as const,
  dashboard:  (days: number) => ['revisions', 'dashboard', days] as const,
}

// ─── Subjects ─────────────────────────────────────────────────────

export function useRevisionSubjects() {
  return useQuery({
    queryKey: revisionKeys.subjects(),
    queryFn: () => revisionsApi.subjects.list(),
  })
}

export function useRevisionSubject(id: string) {
  return useQuery({
    queryKey: revisionKeys.subject(id),
    queryFn: () => revisionsApi.subjects.get(id),
    enabled: !!id,
  })
}

export function useCreateRevisionSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateSubjectPayload) => revisionsApi.subjects.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: revisionKeys.subjects() }),
  })
}

export function useUpdateRevisionSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateSubjectPayload> & { isActive?: boolean } }) =>
      revisionsApi.subjects.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: revisionKeys.subjects() }),
  })
}

export function useDeleteRevisionSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revisionsApi.subjects.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: revisionKeys.subjects() }),
  })
}

// ─── Types ────────────────────────────────────────────────────────

export function useRevisionTypes() {
  return useQuery({
    queryKey: revisionKeys.types(),
    queryFn: () => revisionsApi.types.list(),
  })
}

export function useCreateRevisionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTypePayload) => revisionsApi.types.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: revisionKeys.types() }),
  })
}

export function useUpdateRevisionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateTypePayload> & { isActive?: boolean } }) =>
      revisionsApi.types.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: revisionKeys.types() }),
  })
}

export function useDeleteRevisionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revisionsApi.types.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: revisionKeys.types() }),
  })
}

// ─── Plans ────────────────────────────────────────────────────────

export function useRevisionPlans(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: revisionKeys.planList(params),
    queryFn: () => revisionsApi.plans.list(params),
  })
}

export function useRevisionPlan(id: string) {
  return useQuery({
    queryKey: revisionKeys.plan(id),
    queryFn: () => revisionsApi.plans.get(id),
    enabled: !!id,
  })
}

export function useCreateRevisionPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePlanPayload) => revisionsApi.plans.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: revisionKeys.plans() }),
  })
}

export function useUpdateRevisionPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Record<string, unknown> }) =>
      revisionsApi.plans.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: revisionKeys.plans() })
      qc.invalidateQueries({ queryKey: revisionKeys.plan(id) })
    },
  })
}

export function useDeleteRevisionPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revisionsApi.plans.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: revisionKeys.plans() }),
  })
}

export function useRecordRevisionEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, dto }: { planId: string; dto: Partial<CreateEventPayload> }) =>
      revisionsApi.plans.recordEvent(planId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: revisionKeys.plans() })
      qc.invalidateQueries({ queryKey: revisionKeys.events() })
    },
  })
}

export function usePlanHistory(planId: string) {
  return useQuery({
    queryKey: revisionKeys.planHistory(planId),
    queryFn: () => revisionsApi.plans.history(planId),
    enabled: !!planId,
  })
}

// ─── Events ───────────────────────────────────────────────────────

export function useRevisionEvents(planId?: string) {
  return useQuery({
    queryKey: revisionKeys.events(),
    queryFn: () => revisionsApi.events.list(planId),
  })
}

export function useCreateRevisionEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateEventPayload) => revisionsApi.events.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: revisionKeys.plans() })
      qc.invalidateQueries({ queryKey: revisionKeys.events() })
    },
  })
}

export function useDeleteRevisionEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revisionsApi.events.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: revisionKeys.plans() })
      qc.invalidateQueries({ queryKey: revisionKeys.events() })
    },
  })
}

// ─── Dashboard ────────────────────────────────────────────────────

export function useRevisionDashboard(days = 30) {
  return useQuery({
    queryKey: revisionKeys.dashboard(days),
    queryFn: () => revisionsApi.dashboard(days),
    staleTime: 60_000,
  })
}
