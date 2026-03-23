import { apiClient } from '../../../core/api/client'

export interface MioConversation {
  id: string
  tenantId: string
  userId: string
  title: string | null
  context: Record<string, unknown> | null
  starred: boolean
  createdAt: string
  updatedAt: string
  messages?: MioMessage[]
}

export interface MioMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls: string[] | null
  toolResults: unknown | null
  tokens: number | null
  createdAt: string
}

export interface MioQuickAction {
  id: string
  label: string
  prompt: string
}

export interface MioChatResponse {
  response: string
  conversationId: string
  toolsUsed: string[]
}

export const mioChatApi = {
  conversations: {
    list: (page = 1, limit = 20) =>
      apiClient.get<{ data: MioConversation[]; total: number }>('/mio/conversations', { params: { page, limit } }).then(r => r.data),
    get: (id: string) =>
      apiClient.get<MioConversation>(`/mio/conversations/${id}`).then(r => r.data),
    create: (dto: { title?: string; context?: Record<string, unknown> }) =>
      apiClient.post<MioConversation>('/mio/conversations', dto).then(r => r.data),
    update: (id: string, dto: { title?: string; starred?: boolean }) =>
      apiClient.put<MioConversation>(`/mio/conversations/${id}`, dto).then(r => r.data),
    remove: (id: string) =>
      apiClient.delete(`/mio/conversations/${id}`).then(r => r.data),
  },
  chat: (dto: {
    messages: { role: 'user' | 'assistant'; content: string }[]
    conversationId?: string
    context?: Record<string, unknown>
  }) => apiClient.post<MioChatResponse>('/mio/chat', dto).then(r => r.data),
  quickActions: () =>
    apiClient.get<MioQuickAction[]>('/mio/quick-actions').then(r => r.data),
}
