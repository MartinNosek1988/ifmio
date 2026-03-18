import { apiClient } from '../../../core/api/client'

export interface OutboxEntry {
  id: string
  channel: string
  recipient: string
  subject: string | null
  status: string
  externalId: string | null
  error: string | null
  cost: number | null
  createdAt: string
}

export const communicationApi = {
  getOutbox: (limit = 50) =>
    apiClient.get<OutboxEntry[]>('/communication/outbox', { params: { limit } }).then(r => r.data),
}
