import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Eye, FileSignature } from 'lucide-react'
import { apiClient } from '../../core/api/client'
import { Badge, Button, Table, LoadingState } from '../../shared/components'
import { useToast } from '../../shared/components/toast/Toast'
import type { Column } from '../../shared/components'
import ESignCreateModal from './ESignCreateModal'

const STATUS_BADGE: Record<string, { label: string; variant: string }> = {
  draft: { label: 'Koncept', variant: 'muted' },
  sent: { label: 'Odesláno', variant: 'blue' },
  in_progress: { label: 'Probíhá', variant: 'yellow' },
  completed: { label: 'Dokončeno', variant: 'green' },
  expired: { label: 'Vypršelo', variant: 'red' },
  cancelled: { label: 'Zrušeno', variant: 'red' },
}

export default function ESignListPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['esign', 'list', filter],
    queryFn: () => apiClient.get('/esign', { params: filter ? { status: filter } : {} }).then(r => r.data),
  })

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/esign/${id}/send`),
    onSuccess: () => { toast.success('Žádost odeslána'); queryClient.invalidateQueries({ queryKey: ['esign'] }); },
  })

  const columns: Column<any>[] = [
    { key: 'documentTitle', label: 'Dokument', render: (r: any) => <span style={{ fontWeight: 500 }}>{r.documentTitle}</span> },
    { key: 'documentType', label: 'Typ', render: (r: any) => <Badge variant="muted">{r.documentType}</Badge> },
    { key: 'signatories', label: 'Podpisy', render: (r: any) => {
      const signed = r.signatories?.filter((s: any) => s.status === 'signed').length ?? 0
      const total = r.signatories?.length ?? 0
      return `${signed}/${total}`
    }},
    { key: 'status', label: 'Stav', render: (r: any) => {
      const b = STATUS_BADGE[r.status] ?? STATUS_BADGE.draft
      return <Badge variant={b.variant as any}>{b.label}</Badge>
    }},
    { key: 'expiresAt', label: 'Vyprší', render: (r: any) => new Date(r.expiresAt).toLocaleDateString('cs-CZ') },
    { key: 'actions', label: '', render: (r: any) => (
      <div style={{ display: 'flex', gap: 4 }}>
        {r.status === 'draft' && (
          <Button variant="default" size="sm" onClick={() => sendMutation.mutate(r.id)} aria-label="Odeslat">
            <Send size={14} />
          </Button>
        )}
        <Button variant="default" size="sm" onClick={() => window.open(`/esign/${r.id}`, '_self')} aria-label="Detail">
          <Eye size={14} />
        </Button>
      </div>
    )},
  ]

  if (isLoading) return <LoadingState />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>
          <FileSignature size={20} style={{ marginRight: 8 }} />
          Elektronické podpisy
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '.85rem' }}>
            <option value="">Vše</option>
            {Object.entries(STATUS_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Button variant="primary" onClick={() => setShowCreate(true)}>+ Nová žádost</Button>
        </div>
      </div>

      <Table columns={columns} data={requests} rowKey={(r: any) => r.id} emptyText="Žádné žádosti o podpis" />

      {showCreate && (
        <ESignCreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['esign'] }); }}
        />
      )}
    </div>
  )
}
