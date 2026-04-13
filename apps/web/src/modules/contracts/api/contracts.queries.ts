import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsApi, type CreateContractDto, type UpdateContractDto } from './contracts.api';
import { usePropertyPickerStore } from '../../../core/stores/property-picker.store';

export const contractKeys = {
  all: ['contracts'] as const,
  list: (params?: Record<string, unknown>) => ['contracts', 'list', params] as const,
  stats: () => ['contracts', 'stats'] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
};

export function useContracts(params?: { status?: string; propertyId?: string; search?: string }) {
  const pid = usePropertyPickerStore((s) => s.selectedPropertyId);
  const effectivePropertyId = params?.propertyId ?? pid ?? undefined;
  const scoped = effectivePropertyId
    ? { ...params, propertyId: effectivePropertyId }
    : params;
  return useQuery({
    queryKey: [...contractKeys.list(params as Record<string, unknown>), effectivePropertyId] as const,
    queryFn: () => contractsApi.list(scoped),
  });
}

export function useContractStats() {
  const pid = usePropertyPickerStore((s) => s.selectedPropertyId);
  const effectivePropertyId = pid || undefined;
  return useQuery({
    queryKey: [...contractKeys.stats(), effectivePropertyId] as const,
    queryFn: () => contractsApi.stats(effectivePropertyId),
  });
}

export function useContractDetail(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => contractsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateContractDto) => contractsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateContractDto }) => contractsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

export function useTerminateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { terminatedAt?: string; terminationNote?: string } }) =>
      contractsApi.terminate(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contractsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}
