import { apiClient } from '../../../core/api/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface EmailInboundConfig {
  id: string
  slug: string
  isActive: boolean
  autoApprove: boolean
  allowedFrom: string[]
  address: string
  createdAt: string
}

export interface EmailInboundLog {
  id: string
  fromEmail: string
  fromName: string | null
  subject: string | null
  attachments: number
  status: string
  invoicesCreated: number
  createdAt: string
}

export function useEmailInboundConfig() {
  return useQuery<EmailInboundConfig | null>({
    queryKey: ['email-inbound-config'],
    queryFn: () => apiClient.get('/email/inbound/config').then(r => r.data),
  })
}

export function useUpsertEmailInboundConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { isActive?: boolean; autoApprove?: boolean }) =>
      apiClient.post('/email/inbound/config', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-inbound-config'] }),
  })
}

export function useEmailInboundLogs() {
  return useQuery<EmailInboundLog[]>({
    queryKey: ['email-inbound-logs'],
    queryFn: () => apiClient.get('/email/inbound/log').then(r => r.data),
  })
}
