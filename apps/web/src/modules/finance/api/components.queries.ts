import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { componentsApi } from './components.api'

export const componentKeys = {
  list: (propertyId: string) => ['components', propertyId] as const,
  detail: (propertyId: string, componentId: string) => ['components', propertyId, componentId] as const,
  unitPreview: (propertyId: string, unitId: string) => ['components', 'unit-preview', propertyId, unitId] as const,
  propertyPreview: (propertyId: string) => ['components', 'property-preview', propertyId] as const,
}

export function usePropertyComponents(propertyId: string | undefined, activeOnly = true) {
  return useQuery({
    queryKey: [...componentKeys.list(propertyId ?? ''), activeOnly],
    queryFn: () => componentsApi.list(propertyId!, activeOnly),
    enabled: !!propertyId,
  })
}

export function useComponentDetail(propertyId: string | undefined, componentId: string | undefined) {
  return useQuery({
    queryKey: componentKeys.detail(propertyId ?? '', componentId ?? ''),
    queryFn: () => componentsApi.getOne(propertyId!, componentId!),
    enabled: !!propertyId && !!componentId,
  })
}

export function useCreateComponent(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => componentsApi.create(propertyId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }) },
  })
}

export function useUpdateComponent(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { componentId: string; data: Record<string, unknown> }) => componentsApi.update(propertyId, args.componentId, args.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }) },
  })
}

export function useArchiveComponent(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (componentId: string) => componentsApi.archive(propertyId, componentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }) },
  })
}

export function useAssignUnits(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { componentId: string; unitIds: string[]; effectiveFrom: string; overrideAmount?: number }) =>
      componentsApi.assignUnits(propertyId, args.componentId, { unitIds: args.unitIds, effectiveFrom: args.effectiveFrom, overrideAmount: args.overrideAmount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }) },
  })
}

export function useRemoveAssignment(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) => componentsApi.removeAssignment(propertyId, assignmentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }) },
  })
}

export function useUpdateAssignment(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { assignmentId: string; overrideAmount?: number | null; note?: string }) =>
      componentsApi.updateAssignment(propertyId, args.assignmentId, { overrideAmount: args.overrideAmount, note: args.note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['components'] }) },
  })
}

export function usePropertyPrescriptionPreview(propertyId: string | undefined) {
  return useQuery({
    queryKey: componentKeys.propertyPreview(propertyId ?? ''),
    queryFn: () => componentsApi.propertyPreview(propertyId!),
    enabled: !!propertyId,
  })
}

export function useGenerateFromComponents(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { month: number; year: number; dueDay?: number; dryRun?: boolean }) =>
      componentsApi.generateFromComponents(propertyId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] })
      qc.invalidateQueries({ queryKey: ['konto'] })
      qc.invalidateQueries({ queryKey: ['components'] })
    },
  })
}
