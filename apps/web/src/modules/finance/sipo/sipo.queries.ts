import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sipoApi } from './sipo.api'

const keys = {
  config: (pid: string) => ['sipo', 'config', pid] as const,
  preview: (pid: string, period: string) => ['sipo', 'preview', pid, period] as const,
  history: (pid: string) => ['sipo', 'history', pid] as const,
  payers: (pid: string) => ['sipo', 'payers', pid] as const,
}

export function useSipoConfig(propertyId: string | undefined) {
  return useQuery({
    queryKey: keys.config(propertyId ?? ''),
    queryFn: () => sipoApi.getConfig(propertyId!),
    enabled: !!propertyId,
  })
}

export function useSipoPreview(propertyId: string | undefined, period: string) {
  return useQuery({
    queryKey: keys.preview(propertyId ?? '', period),
    queryFn: () => sipoApi.preview(propertyId!, period),
    enabled: !!propertyId && !!period,
  })
}

export function useSipoHistory(propertyId: string | undefined) {
  return useQuery({
    queryKey: keys.history(propertyId ?? ''),
    queryFn: () => sipoApi.history(propertyId!),
    enabled: !!propertyId,
  })
}

export function useSipoPayers(propertyId: string | undefined) {
  return useQuery({
    queryKey: keys.payers(propertyId ?? ''),
    queryFn: () => sipoApi.getPayers(propertyId!),
    enabled: !!propertyId,
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, propertyId?: string) {
  qc.invalidateQueries({ queryKey: ['sipo'] })
  if (propertyId) qc.invalidateQueries({ queryKey: ['konto'] })
}

export function useCreateSipoConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { propertyId: string; recipientNumber: string; feeCode: string; deliveryMode?: string; encoding?: string }) =>
      sipoApi.createConfig(dto),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateSipoConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; recipientNumber: string; feeCode: string; deliveryMode?: string; encoding?: string }) =>
      sipoApi.updateConfig(id, dto),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useGenerateSipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ propertyId, period }: { propertyId: string; period: string }) =>
      sipoApi.generate(propertyId, period),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useImportSipoPayments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ propertyId, file }: { propertyId: string; file: File }) =>
      sipoApi.importPayments(propertyId, file),
    onSuccess: (_, vars) => invalidateAll(qc, vars.propertyId),
  })
}

export function useUpdateSipoPayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ occupancyId, sipoNumber }: { occupancyId: string; sipoNumber: string }) =>
      sipoApi.updatePayer(occupancyId, sipoNumber),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sipo', 'payers'] }),
  })
}
