import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kontoRemindersApi } from './konto-reminders.api'

export const reminderKeys = {
  property: (propertyId: string) => ['konto-reminders', propertyId] as const,
  account: (accountId: string) => ['konto-reminders', 'account', accountId] as const,
}

export function usePropertyReminders(propertyId: string | undefined, status?: string) {
  return useQuery({
    queryKey: [...reminderKeys.property(propertyId ?? ''), status],
    queryFn: () => kontoRemindersApi.getPropertyReminders(propertyId!, { status: status || undefined }),
    enabled: !!propertyId,
  })
}

export function useGenerateReminders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { propertyId: string; minAmount?: number; minDaysOverdue?: number }) =>
      kontoRemindersApi.generate(args.propertyId, { minAmount: args.minAmount, minDaysOverdue: args.minDaysOverdue }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['konto-reminders'] }) },
  })
}

export function useMarkReminderSent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { reminderId: string; method: string }) =>
      kontoRemindersApi.markAsSent(args.reminderId, args.method),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['konto-reminders'] }) },
  })
}

export function useMarkReminderResolved() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reminderId: string) => kontoRemindersApi.markAsResolved(reminderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['konto-reminders'] }) },
  })
}

export function useCancelReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reminderId: string) => kontoRemindersApi.cancelReminder(reminderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['konto-reminders'] }) },
  })
}
