import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersApi, type CreateWorkOrderDto, type UpdateWorkOrderDto, type CreateFromTicketDto } from './workorders.api';

export const woKeys = {
  all: ['workorders'] as const,
  lists: () => ['workorders', 'list'] as const,
  list: (params?: Record<string, unknown>) => ['workorders', 'list', params] as const,
  stats: () => ['workorders', 'stats'] as const,
  detail: (id: string) => ['workorders', 'detail', id] as const,
  forTicket: (ticketId: string) => ['workorders', 'forTicket', ticketId] as const,
};

export function useWorkOrders(params?: { status?: string; priority?: string; search?: string }) {
  return useQuery({
    queryKey: woKeys.list(params as Record<string, unknown>),
    queryFn: () => workOrdersApi.list(params),
  });
}

export function useWOStats() {
  return useQuery({
    queryKey: woKeys.stats(),
    queryFn: () => workOrdersApi.stats(),
    staleTime: 30_000,
  });
}

export function useWorkOrderDetail(id: string) {
  return useQuery({
    queryKey: woKeys.detail(id),
    queryFn: () => workOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useWorkOrdersForTicket(ticketId: string) {
  return useQuery({
    queryKey: woKeys.forTicket(ticketId),
    queryFn: () => workOrdersApi.listForTicket(ticketId),
    enabled: !!ticketId,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWorkOrderDto) => workOrdersApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: woKeys.lists() });
      qc.invalidateQueries({ queryKey: woKeys.stats() });
    },
  });
}

export function useCreateFromTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, dto }: { ticketId: string; dto: CreateFromTicketDto }) =>
      workOrdersApi.createFromTicket(ticketId, dto),
    onSuccess: (_, { ticketId }) => {
      qc.invalidateQueries({ queryKey: woKeys.lists() });
      qc.invalidateQueries({ queryKey: woKeys.stats() });
      qc.invalidateQueries({ queryKey: woKeys.forTicket(ticketId) });
    },
  });
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWorkOrderDto }) => workOrdersApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: woKeys.lists() });
      qc.invalidateQueries({ queryKey: woKeys.stats() });
      qc.invalidateQueries({ queryKey: woKeys.detail(id) });
    },
  });
}

export function useChangeWOStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => workOrdersApi.changeStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: woKeys.lists() });
      qc.invalidateQueries({ queryKey: woKeys.stats() });
      qc.invalidateQueries({ queryKey: woKeys.detail(id) });
    },
  });
}

export function useAddWOComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => workOrdersApi.addComment(id, text),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: woKeys.detail(id) });
    },
  });
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workOrdersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: woKeys.lists() });
      qc.invalidateQueries({ queryKey: woKeys.stats() });
    },
  });
}
