import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { protocolsApi } from './protocols.api'
import type {
  CreateProtocolPayload, UpdateProtocolPayload, CompleteProtocolPayload,
  CreateProtocolLinePayload, GenerateProtocolPayload,
} from './protocols.api'

export const protocolKeys = {
  all:       ['protocols'] as const,
  list:      (p?: Record<string, unknown>) => ['protocols', 'list', p] as const,
  detail:    (id: string) => ['protocols', id] as const,
  bySource:  (sourceType: string, sourceId: string) => ['protocols', 'source', sourceType, sourceId] as const,
}

export function useProtocols(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: protocolKeys.list(params),
    queryFn: () => protocolsApi.list(params),
  })
}

export function useProtocol(id: string) {
  return useQuery({
    queryKey: protocolKeys.detail(id),
    queryFn: () => protocolsApi.get(id),
    enabled: !!id,
  })
}

export function useProtocolsBySource(sourceType: string, sourceId: string) {
  return useQuery({
    queryKey: protocolKeys.bySource(sourceType, sourceId),
    queryFn: () => protocolsApi.getBySource(sourceType, sourceId),
    enabled: !!sourceType && !!sourceId,
  })
}

export function useCreateProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateProtocolPayload) => protocolsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: protocolKeys.all }),
  })
}

export function useGenerateProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: GenerateProtocolPayload) => protocolsApi.generate(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: protocolKeys.all }),
  })
}

export function useUpdateProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProtocolPayload }) =>
      protocolsApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: protocolKeys.all })
      qc.invalidateQueries({ queryKey: protocolKeys.detail(id) })
    },
  })
}

export function useCompleteProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CompleteProtocolPayload }) =>
      protocolsApi.complete(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: protocolKeys.all })
      qc.invalidateQueries({ queryKey: protocolKeys.detail(id) })
    },
  })
}

export function useConfirmProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => protocolsApi.confirm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: protocolKeys.all }),
  })
}

export function useDeleteProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => protocolsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: protocolKeys.all }),
  })
}

export function useAddProtocolLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ protocolId, dto }: { protocolId: string; dto: CreateProtocolLinePayload }) =>
      protocolsApi.addLine(protocolId, dto),
    onSuccess: (_, { protocolId }) => {
      qc.invalidateQueries({ queryKey: protocolKeys.detail(protocolId) })
      qc.invalidateQueries({ queryKey: protocolKeys.all })
    },
  })
}

export function useUpdateProtocolLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ protocolId, lineId, dto }: { protocolId: string; lineId: string; dto: Partial<CreateProtocolLinePayload> }) =>
      protocolsApi.updateLine(protocolId, lineId, dto),
    onSuccess: (_, { protocolId }) => {
      qc.invalidateQueries({ queryKey: protocolKeys.detail(protocolId) })
    },
  })
}

export function useDeleteProtocolLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ protocolId, lineId }: { protocolId: string; lineId: string }) =>
      protocolsApi.removeLine(protocolId, lineId),
    onSuccess: (_, { protocolId }) => {
      qc.invalidateQueries({ queryKey: protocolKeys.detail(protocolId) })
    },
  })
}

export function useReorderProtocolLines() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ protocolId, items }: { protocolId: string; items: { lineId: string; sortOrder: number }[] }) =>
      protocolsApi.reorderLines(protocolId, items),
    onSuccess: (_, { protocolId }) => {
      qc.invalidateQueries({ queryKey: protocolKeys.detail(protocolId) })
    },
  })
}
