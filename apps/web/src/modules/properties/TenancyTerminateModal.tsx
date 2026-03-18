import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Button } from '../../shared/components'
import { tenanciesApi } from './tenancies-api'

interface Props {
  tenancy: { id: string; party: { displayName: string } }
  onClose: () => void
  onTerminated: () => void
}

export default function TenancyTerminateModal({ tenancy, onClose, onTerminated }: Props) {
  const qc = useQueryClient()
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => tenanciesApi.terminate(tenancy.id, moveOutDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenancies'] })
      qc.invalidateQueries({ queryKey: ['properties'] })
      onTerminated()
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Chyba při ukončení'),
  })

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }

  return (
    <Modal
      open onClose={onClose}
      title="Ukončit nájemní vztah"
      subtitle={tenancy.party.displayName}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Ukončuji...' : 'Ukončit nájem'}
          </Button>
        </div>
      }
    >
      {error && <div style={{ color: 'var(--danger)', fontSize: '.85rem', marginBottom: 12 }}>{error}</div>}

      <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
        Opravdu chcete ukončit nájemní vztah s <strong>{tenancy.party.displayName}</strong>?
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>
          Datum ukončení *
        </label>
        <input type="date" value={moveOutDate} onChange={e => setMoveOutDate(e.target.value)} style={inputStyle} required />
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Nájemní vztah bude označen jako neaktivní. Data zůstanou v historii.
      </p>
    </Modal>
  )
}
