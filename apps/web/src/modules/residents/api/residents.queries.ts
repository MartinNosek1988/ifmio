import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { residentsApi } from './residents.api';
import type { CreateResidentPayload } from './residents.api';

export const residentsKeys = {
  all: ['residents'] as const,
  lists: () => ['residents', 'list'] as const,
  list: (p: Record<string, unknown>) => ['residents', 'list', p] as const,
  detail: (id: string) => ['residents', 'detail', id] as const,
  debtors: () => ['residents', 'debtors'] as const,
};

export function useResidents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: residentsKeys.list(params ?? {}),
    queryFn: () => residentsApi.list(params),
  });
}

export function useResident(id: string) {
  return useQuery({
    queryKey: residentsKeys.detail(id),
    queryFn: () => residentsApi.detail(id),
    enabled: !!id,
  });
}

export function useDebtors() {
  return useQuery({
    queryKey: residentsKeys.debtors(),
    queryFn: () => residentsApi.debtors(),
  });
}

export function useCreateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateResidentPayload) => residentsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: residentsKeys.lists() }),
  });
}

export function useUpdateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateResidentPayload> }) =>
      residentsApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: residentsKeys.lists() });
      qc.invalidateQueries({ queryKey: residentsKeys.detail(id) });
    },
  });
}

export function useDeleteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => residentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: residentsKeys.lists() }),
  });
}

export function useBulkDeactivateResidents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => residentsApi.bulkDeactivate(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: residentsKeys.all }),
  });
}

export function useBulkActivateResidents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => residentsApi.bulkActivate(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: residentsKeys.all }),
  });
}

export function useBulkAssignProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, propertyId }: { ids: string[]; propertyId: string }) =>
      residentsApi.bulkAssignProperty(ids, propertyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: residentsKeys.all }),
  });
}

export function useBulkMarkDebtors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, hasDebt }: { ids: string[]; hasDebt: boolean }) =>
      residentsApi.bulkMarkDebtors(ids, hasDebt),
    onSuccess: () => qc.invalidateQueries({ queryKey: residentsKeys.all }),
  });
}
