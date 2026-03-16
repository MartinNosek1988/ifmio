import { apiClient } from '../../../core/api/client'

export interface KontoReminderRow {
  id: string
  tenantId: string
  propertyId: string
  accountId: string
  residentId: string
  unitId: string
  reminderNumber: number
  amount: number
  dueDate: string
  sentAt: string | null
  sentMethod: string | null
  status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED'
  note: string | null
  generatedText: string | null
  createdAt: string
  updatedAt: string
  resident: {
    id: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
    isLegalEntity: boolean
  }
  unit: { id: string; name: string }
}

export const kontoRemindersApi = {
  generate: (propertyId: string, data: { minAmount?: number; minDaysOverdue?: number }) =>
    apiClient.post<KontoReminderRow[]>(`/konto-reminders/generate/${propertyId}`, data).then(r => r.data),

  getPropertyReminders: (propertyId: string, params?: { status?: string; accountId?: string }) =>
    apiClient.get<KontoReminderRow[]>(`/konto-reminders/property/${propertyId}`, { params }).then(r => r.data),

  getAccountReminders: (accountId: string) =>
    apiClient.get<KontoReminderRow[]>(`/konto-reminders/account/${accountId}`).then(r => r.data),

  markAsSent: (reminderId: string, method: string) =>
    apiClient.patch(`/konto-reminders/${reminderId}/send`, { method }).then(r => r.data),

  markAsResolved: (reminderId: string) =>
    apiClient.patch(`/konto-reminders/${reminderId}/resolve`).then(r => r.data),

  cancelReminder: (reminderId: string) =>
    apiClient.patch(`/konto-reminders/${reminderId}/cancel`).then(r => r.data),
}
