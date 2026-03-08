import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { remindersApi } from './reminders.api'

export const reminderKeys = {
  templates:  () => ['reminders', 'templates']       as const,
  debtors:    () => ['reminders', 'debtors']         as const,
  list:       (p?: any) => ['reminders', 'list', p]  as const,
}

export function useReminderTemplates() {
  return useQuery({
    queryKey: reminderKeys.templates(),
    queryFn:  () => remindersApi.templates.list(),
  })
}

export function useDebtors() {
  return useQuery({
    queryKey: reminderKeys.debtors(),
    queryFn:  () => remindersApi.debtors(),
  })
}

export function useReminders(params?: any) {
  return useQuery({
    queryKey: reminderKeys.list(params),
    queryFn:  () => remindersApi.list(params),
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => remindersApi.create(dto),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: reminderKeys.list() })
      qc.invalidateQueries({ queryKey: reminderKeys.debtors() })
    },
  })
}

export function useBulkCreateReminders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => remindersApi.bulkCreate(dto),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: reminderKeys.list() })
      qc.invalidateQueries({ queryKey: reminderKeys.debtors() })
    },
  })
}

export function useMarkReminderAsSent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => remindersApi.markAsSent(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: reminderKeys.list() }),
  })
}

export function useMarkReminderAsPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => remindersApi.markAsPaid(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: reminderKeys.list() })
      qc.invalidateQueries({ queryKey: reminderKeys.debtors() })
      qc.invalidateQueries({ queryKey: ['residents'] })
    },
  })
}
