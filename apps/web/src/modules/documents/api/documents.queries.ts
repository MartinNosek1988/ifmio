import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from './documents.api';
import { usePropertyPickerStore } from '../../../core/stores/property-picker.store';

export const docKeys = {
  all: ['documents'] as const,
  list: (params?: Record<string, unknown>) => ['documents', 'list', params] as const,
  stats: () => ['documents', 'stats'] as const,
};

export function useDocuments(params?: { category?: string; search?: string; tag?: string; propertyId?: string; entityType?: string; entityId?: string }) {
  const pid = usePropertyPickerStore((s) => s.selectedPropertyId);
  const effectivePropertyId = params?.propertyId ?? pid ?? undefined;
  const scoped = effectivePropertyId
    ? { ...params, propertyId: effectivePropertyId }
    : params;
  return useQuery({
    queryKey: [...docKeys.list(params as Record<string, unknown>), effectivePropertyId] as const,
    queryFn: () => documentsApi.list(scoped),
  });
}

export function useDocStats() {
  return useQuery({
    queryKey: docKeys.stats(),
    queryFn: () => documentsApi.stats(),
    staleTime: 30_000,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: Parameters<typeof documentsApi.upload>[1] }) =>
      documentsApi.upload(file, meta),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docKeys.all });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docKeys.all });
    },
  });
}
