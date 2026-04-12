import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metersApi, type CreateMeterDto } from './meters.api';
import { usePropertyPickerStore } from '../../../core/stores/property-picker.store';

export const meterKeys = {
  all: ['meters'] as const,
  list: (params?: Record<string, unknown>) => ['meters', 'list', params] as const,
  stats: () => ['meters', 'stats'] as const,
  detail: (id: string) => ['meters', 'detail', id] as const,
  readings: (id: string) => ['meters', 'readings', id] as const,
};

export function useMeters(params?: { meterType?: string; propertyId?: string; search?: string }) {
  const pid = usePropertyPickerStore((s) => s.selectedPropertyId);
  const scoped = pid ? { ...params, propertyId: params?.propertyId ?? pid } : params;
  return useQuery({
    queryKey: [...meterKeys.list(params as Record<string, unknown>), pid] as const,
    queryFn: () => metersApi.list(scoped),
  });
}

export function useMeterStats() {
  const pid = usePropertyPickerStore((s) => s.selectedPropertyId);
  return useQuery({
    queryKey: [...meterKeys.stats(), pid] as const,
    queryFn: () => metersApi.stats(pid ?? undefined),
    staleTime: 30_000,
  });
}

export function useMeterDetail(id: string) {
  return useQuery({
    queryKey: meterKeys.detail(id),
    queryFn: () => metersApi.getById(id),
    enabled: !!id,
  });
}

export function useMeterReadings(meterId: string) {
  return useQuery({
    queryKey: meterKeys.readings(meterId),
    queryFn: () => metersApi.getReadings(meterId),
    enabled: !!meterId,
  });
}

export function useCreateMeter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateMeterDto) => metersApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meterKeys.all });
    },
  });
}

export function useUpdateMeter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateMeterDto> & { isActive?: boolean } }) =>
      metersApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meterKeys.all });
    },
  });
}

export function useDeleteMeter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => metersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meterKeys.all });
    },
  });
}

export function useAddMeterReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meterId, dto }: { meterId: string; dto: { readingDate: string; value: number; note?: string } }) =>
      metersApi.addReading(meterId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meterKeys.all });
    },
  });
}
