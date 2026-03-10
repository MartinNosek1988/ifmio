import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi, type CreateCalendarEventDto } from './calendar.api';

export const calendarKeys = {
  all: ['calendar'] as const,
  events: (params?: Record<string, unknown>) => ['calendar', 'events', params] as const,
  stats: () => ['calendar', 'stats'] as const,
  detail: (id: string) => ['calendar', 'detail', id] as const,
};

export function useCalendarEvents(params?: { from?: string; to?: string; eventType?: string; search?: string }) {
  return useQuery({
    queryKey: calendarKeys.events(params as Record<string, unknown>),
    queryFn: () => calendarApi.events(params),
  });
}

export function useCalendarStats() {
  return useQuery({
    queryKey: calendarKeys.stats(),
    queryFn: () => calendarApi.stats(),
    staleTime: 30_000,
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCalendarEventDto) => calendarApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateCalendarEventDto> }) =>
      calendarApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calendarApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}
