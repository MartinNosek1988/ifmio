import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evidenceFoldersApi } from './evidence-folders.api'

export const evidenceKeys = {
  list: (propertyId: string) => ['evidence-folders', propertyId] as const,
  invoiceAllocations: (invoiceId: string) => ['evidence-allocations', invoiceId] as const,
}

export function useEvidenceFolders(propertyId: string | undefined) {
  return useQuery({
    queryKey: evidenceKeys.list(propertyId ?? ''),
    queryFn: () => evidenceFoldersApi.list(propertyId!),
    enabled: !!propertyId,
  })
}

export function useCreateEvidenceFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => evidenceFoldersApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence-folders'] }),
  })
}

export function useUpdateEvidenceFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Record<string, unknown> }) => evidenceFoldersApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence-folders'] }),
  })
}

export function useDeleteEvidenceFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => evidenceFoldersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence-folders'] }),
  })
}

export function useInvoiceEvidenceAllocations(invoiceId: string | undefined) {
  return useQuery({
    queryKey: evidenceKeys.invoiceAllocations(invoiceId ?? ''),
    queryFn: () => evidenceFoldersApi.listAllocations(invoiceId!),
    enabled: !!invoiceId,
  })
}

export function useCreateEvidenceAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, dto }: { invoiceId: string; dto: Record<string, unknown> }) =>
      evidenceFoldersApi.createAllocation(invoiceId, dto),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: evidenceKeys.invoiceAllocations(vars.invoiceId) })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices', vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
    },
  })
}

export function useUpdateEvidenceAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, allocationId, dto }: { invoiceId: string; allocationId: string; dto: Record<string, unknown> }) =>
      evidenceFoldersApi.updateAllocation(invoiceId, allocationId, dto),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: evidenceKeys.invoiceAllocations(vars.invoiceId) })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices', vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
    },
  })
}

export function useDeleteEvidenceAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, allocationId }: { invoiceId: string; allocationId: string }) =>
      evidenceFoldersApi.deleteAllocation(invoiceId, allocationId),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: evidenceKeys.invoiceAllocations(vars.invoiceId) })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices', vars.invoiceId] })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
    },
  })
}
