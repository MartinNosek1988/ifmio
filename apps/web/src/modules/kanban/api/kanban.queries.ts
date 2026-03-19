import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kanbanApi } from './kanban.api'

export function useKanbanBoard(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['kanban', 'board', params],
    queryFn: () => kanbanApi.getBoard(params),
  })
}

export function useCreateKanbanTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: kanbanApi.createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}

export function useUpdateKanbanTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => kanbanApi.updateTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}

export function useDeleteKanbanTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: kanbanApi.deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}

export function useMoveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: kanbanApi.moveCard,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban'] }),
  })
}
