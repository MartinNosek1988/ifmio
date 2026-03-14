import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetTypesApi } from './asset-types.api'
import type { CreateAssetTypePayload, CreateAssignmentPayload } from './asset-types.api'

export const assetTypeKeys = {
  all: ['asset-types'] as const,
  list: () => ['asset-types', 'list'] as const,
  detail: (id: string) => ['asset-types', id] as const,
  assignments: (id: string) => ['asset-types', id, 'assignments'] as const,
  preview: (id: string) => ['asset-types', id, 'preview'] as const,
}

// ─── Asset Types ──────────────────────────────────────────────────

export function useAssetTypes() {
  return useQuery({
    queryKey: assetTypeKeys.list(),
    queryFn: () => assetTypesApi.list(),
  })
}

export function useAssetType(id: string) {
  return useQuery({
    queryKey: assetTypeKeys.detail(id),
    queryFn: () => assetTypesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateAssetType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateAssetTypePayload) => assetTypesApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetTypeKeys.all }),
  })
}

export function useUpdateAssetType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateAssetTypePayload> & { isActive?: boolean } }) =>
      assetTypesApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetTypeKeys.all }),
  })
}

export function useDeleteAssetType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => assetTypesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetTypeKeys.all }),
  })
}

// ─── Assignments ──────────────────────────────────────────────────

export function useAssetTypeAssignments(assetTypeId: string) {
  return useQuery({
    queryKey: assetTypeKeys.assignments(assetTypeId),
    queryFn: () => assetTypesApi.assignments.list(assetTypeId),
    enabled: !!assetTypeId,
  })
}

export function useCreateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assetTypeId, dto }: { assetTypeId: string; dto: CreateAssignmentPayload }) =>
      assetTypesApi.assignments.create(assetTypeId, dto),
    onSuccess: (_, { assetTypeId }) => {
      qc.invalidateQueries({ queryKey: assetTypeKeys.assignments(assetTypeId) })
      qc.invalidateQueries({ queryKey: assetTypeKeys.preview(assetTypeId) })
      qc.invalidateQueries({ queryKey: assetTypeKeys.list() })
    },
  })
}

export function useUpdateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assetTypeId, assignmentId, dto }: { assetTypeId: string; assignmentId: string; dto: Record<string, unknown> }) =>
      assetTypesApi.assignments.update(assetTypeId, assignmentId, dto),
    onSuccess: (_, { assetTypeId }) => {
      qc.invalidateQueries({ queryKey: assetTypeKeys.assignments(assetTypeId) })
      qc.invalidateQueries({ queryKey: assetTypeKeys.preview(assetTypeId) })
    },
  })
}

export function useDeleteAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assetTypeId, assignmentId }: { assetTypeId: string; assignmentId: string }) =>
      assetTypesApi.assignments.remove(assetTypeId, assignmentId),
    onSuccess: (_, { assetTypeId }) => {
      qc.invalidateQueries({ queryKey: assetTypeKeys.assignments(assetTypeId) })
      qc.invalidateQueries({ queryKey: assetTypeKeys.preview(assetTypeId) })
      qc.invalidateQueries({ queryKey: assetTypeKeys.list() })
    },
  })
}

// ─── Preview ──────────────────────────────────────────────────────

export function useAssetTypePreview(assetTypeId: string) {
  return useQuery({
    queryKey: assetTypeKeys.preview(assetTypeId),
    queryFn: () => assetTypesApi.previewPlans(assetTypeId),
    enabled: !!assetTypeId,
  })
}
