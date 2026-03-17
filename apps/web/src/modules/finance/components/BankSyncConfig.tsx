import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Modal } from '../../../shared/components'
import { apiClient } from '../../../core/api/client'

interface Props {
  bankAccountId: string
  bankAccountName: string
  onClose: () => void
}

export function BankSyncConfig({ bankAccountId, bankAccountName, onClose }: Props) {
  const qc = useQueryClient()
  const [provider, setProvider] = useState('fio')
  const [apiToken, setApiToken] = useState('')
  const [syncInterval, setSyncInterval] = useState(60)

  const { data: status } = useQuery({
    queryKey: ['banking', 'status', bankAccountId],
    queryFn: () => apiClient.get(`/banking/${bankAccountId}/status`).then(r => r.data),
  })

  const configureMutation = useMutation({
    mutationFn: () => apiClient.post(`/banking/${bankAccountId}/configure`, { provider, apiToken, syncIntervalMin: syncInterval }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking', 'status', bankAccountId] })
      qc.invalidateQueries({ queryKey: ['finance'] })
      setApiToken('')
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => apiClient.post(`/banking/${bankAccountId}/sync`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking', 'status', bankAccountId] })
      qc.invalidateQueries({ queryKey: ['finance'] })
    },
  })

  const disableMutation = useMutation({
    mutationFn: () => apiClient.post(`/banking/${bankAccountId}/disable`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banking', 'status', bankAccountId] }),
  })

  const isConfigured = status?.syncEnabled
  const inputStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', width: '100%', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }

  return (
    <Modal
      open
      onClose={onClose}
      title="Automatický import"
      subtitle={bankAccountName}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zavřít</Button>
        </div>
      }
    >
      {/* Current status */}
      {isConfigured && (
        <div style={{ background: 'var(--surface-2, #f3f4f6)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Badge variant={status.syncStatus === 'active' ? 'green' : status.syncStatus === 'error' ? 'red' : 'muted'}>
              {status.syncStatus === 'active' ? 'Aktivní' : status.syncStatus === 'error' ? 'Chyba' : 'Vypnuto'}
            </Badge>
            <span className="text-muted text-sm">
              {status.bankProvider?.toUpperCase()} · token ****{status.apiTokenLastFour}
            </span>
          </div>
          {status.lastSyncAt && (
            <div className="text-muted text-sm">
              Poslední sync: {new Date(status.lastSyncAt).toLocaleString('cs-CZ')}
              {' · '}{status._count?.transactions ?? 0} transakcí
            </div>
          )}
          {status.syncStatusMessage && (
            <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 4 }}>{status.syncStatusMessage}</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              {syncMutation.isPending ? 'Synchronizuji...' : 'Synchronizovat nyní'}
            </Button>
            <Button size="sm" variant="danger" onClick={() => disableMutation.mutate()} disabled={disableMutation.isPending}>
              Vypnout sync
            </Button>
          </div>
          {syncMutation.data && (
            <div style={{ fontSize: '.8rem', marginTop: 6, color: 'var(--accent-green, #22c55e)' }}>
              Importováno: {(syncMutation.data as any).imported}, přeskočeno: {(syncMutation.data as any).skipped}
            </div>
          )}
        </div>
      )}

      {/* Configure form */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Poskytovatel</label>
        <select value={provider} onChange={e => setProvider(e.target.value)} style={inputStyle}>
          <option value="fio">Fio banka</option>
          <option value="kb" disabled>Komerční banka (připravujeme)</option>
          <option value="csob" disabled>ČSOB (připravujeme)</option>
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>API Token {isConfigured && '(nový token nahradí stávající)'}</label>
        <input
          type="password"
          value={apiToken}
          onChange={e => setApiToken(e.target.value)}
          placeholder={isConfigured ? '••••••••' : 'Vložte API token z Fio internetbankingu'}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Interval synchronizace (min)</label>
        <select value={syncInterval} onChange={e => setSyncInterval(Number(e.target.value))} style={inputStyle}>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={60}>1 hodina</option>
          <option value={360}>6 hodin</option>
          <option value={1440}>1× denně</option>
        </select>
      </div>

      <Button
        variant="primary"
        onClick={() => configureMutation.mutate()}
        disabled={!apiToken || configureMutation.isPending}
      >
        {configureMutation.isPending ? 'Nastavuji...' : isConfigured ? 'Aktualizovat nastavení' : 'Aktivovat automatický import'}
      </Button>

      {configureMutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '.85rem', marginTop: 8 }}>
          {(configureMutation.error as any)?.response?.data?.message ?? 'Nepodařilo se nastavit sync'}
        </div>
      )}
    </Modal>
  )
}
