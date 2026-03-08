import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi } from './properties-api';
import type { CreatePropertyPayload, UpdatePropertyPayload } from './properties-api';

const KEYS = {
  all: ['properties'] as const,
  detail: (id: string) => ['properties', id] as const,
};

export function useProperties() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: propertiesApi.list,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => propertiesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePropertyPayload) => propertiesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePropertyPayload }) =>
      propertiesApi.update(id, data),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
    },
  });
}

export function useArchiveProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertiesApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
