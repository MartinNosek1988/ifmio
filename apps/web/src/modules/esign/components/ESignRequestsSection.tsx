import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../core/api/client'
import { ESignStatusBadge } from './ESignStatusBadge'
import type { ESignRequest } from '../api/esign.api'

interface Props {
  documentType: string
  documentId: string
}

export function ESignRequestsSection({ documentType, documentId }: Props) {
  const { data: allRequests = [] } = useQuery({
    queryKey: ['esign', 'list', documentType, documentId],
    queryFn: () => apiClient.get<ESignRequest[]>('/esign', {
      params: { documentType, documentId },
    }).then(r => r.data),
  })

  // Filter client-side as fallback if API doesn't support filtering
  const requests = allRequests.filter(
    r => r.documentType === documentType && r.documentId === documentId,
  )

  if (requests.length === 0) return null

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Elektronické podpisy</div>
      {requests.map(req => (
        <div
          key={req.id}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
            marginBottom: 6, fontSize: '0.82rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            {new Date(req.createdAt).toLocaleDateString('cs-CZ')}
            {' · '}
            {req.signatories.filter(s => s.status === 'signed').length}/{req.signatories.length} podpisů
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ESignStatusBadge status={req.status} />
            <a href={`/esign`} style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>Detail →</a>
          </div>
        </div>
      ))}
    </div>
  )
}
