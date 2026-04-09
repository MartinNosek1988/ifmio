import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from './notifications.api'

export const notifKeys = {
  all: () => ['notifications'] as const,
  list: (unreadOnly?: boolean, type?: string) => ['notifications', { unreadOnly, type }] as const,
  unread: () => ['notifications', 'unread-count'] as const,
}

export function useNotifications(unreadOnly = false, type?: string) {
  return useQuery({
    queryKey: notifKeys.list(unreadOnly, type),
    queryFn: () => notificationsApi.list(unreadOnly, type),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unread(),
    queryFn: notificationsApi.unreadCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notifKeys.all() })
      const previousLists = qc.getQueriesData({ queryKey: ['notifications'] })
      // Optimistically mark as read in all notification list caches
      qc.setQueriesData(
        { queryKey: ['notifications'] },
        (old: unknown) => {
          if (!Array.isArray(old)) return old
          return old.map((n: Record<string, unknown>) => n.id === id ? { ...n, isRead: true } : n)
        },
      )
      // Optimistically decrement unread count
      qc.setQueryData(notifKeys.unread(), (old: number | undefined) =>
        typeof old === 'number' && old > 0 ? old - 1 : old,
      )
      return { previousLists }
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all() })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all() })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all() })
    },
  })
}

export function useGenerateNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.generate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all() })
    },
  })
}
