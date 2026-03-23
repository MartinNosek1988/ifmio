import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mioChatApi } from './mio-chat.api'

export const mioKeys = {
  conversations: () => ['mio', 'conversations'] as const,
  conversation: (id: string) => ['mio', 'conversation', id] as const,
  quickActions: () => ['mio', 'quick-actions'] as const,
}

export function useMioConversations() {
  return useQuery({
    queryKey: mioKeys.conversations(),
    queryFn: () => mioChatApi.conversations.list(1, 50),
  })
}

export function useMioConversation(id: string | null) {
  return useQuery({
    queryKey: mioKeys.conversation(id ?? ''),
    queryFn: () => mioChatApi.conversations.get(id!),
    enabled: !!id,
  })
}

export function useCreateMioConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { title?: string; context?: Record<string, unknown> }) =>
      mioChatApi.conversations.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: mioKeys.conversations() }),
  })
}

export function useUpdateMioConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { title?: string; starred?: boolean } }) =>
      mioChatApi.conversations.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: mioKeys.conversations() }),
  })
}

export function useDeleteMioConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mioChatApi.conversations.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mioKeys.conversations() }),
  })
}

export function useMioChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      messages: { role: 'user' | 'assistant'; content: string }[]
      conversationId?: string
      context?: Record<string, unknown>
    }) => mioChatApi.chat(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mioKeys.conversations() })
      if (data.conversationId) {
        qc.invalidateQueries({ queryKey: mioKeys.conversation(data.conversationId) })
      }
    },
  })
}

export function useMioQuickActions() {
  return useQuery({
    queryKey: mioKeys.quickActions(),
    queryFn: () => mioChatApi.quickActions(),
    staleTime: 5 * 60_000,
  })
}
