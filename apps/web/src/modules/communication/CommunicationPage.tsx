import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Table, Badge, Button, LoadingState, EmptyState } from '../../shared/components'
import type { Column, BadgeVariant } from '../../shared/components'
import { communicationApi, type OutboxEntry } from './api/communication.api'
import { ChannelStatusSection } from './ChannelStatusSection'
import { SendMessageDialog } from './SendMessageDialog'

const CHANNEL_ICONS: Record<string, string> = {
  email: '✉️', whatsapp: '💬', sms: '📱', teams: '🔷',
  letter: '📮', isds: '📨', whatsapp_incoming: '💬', whatsapp_auto: '💬',
  whatsapp_vote: '🗳️',
}

const STATUS_CONFIG: Record<string, { label: string; color: BadgeVariant }> = {
  sent: { label: 'Odesláno', color: 'green' },
  failed: { label: 'Chyba', color: 'red' },
  pending: { label: 'Čeká', color: 'yellow' },
  received: { label: 'Přijato', color: 'blue' },
}

type Tab = 'outbox' | 'channels'

export default function CommunicationPage() {
  const [tab, setTab] = useState<Tab>('outbox')
  const [showSend, setShowSend] = useState(false)
  const qc = useQueryClient()

  const { data: outbox = [], isLoading } = useQuery({
    queryKey: ['communication', 'outbox'],
    queryFn: () => communicationApi.getOutbox(100),
  })

  const columns: Column<OutboxEntry>[] = [
    {
      key: 'channel', label: 'Kanál',
      render: (e) => <span>{CHANNEL_ICONS[e.channel] ?? '📨'} {e.channel}</span>,
    },
    { key: 'recipient', label: 'Příjemce', render: (e) => <span style={{ fontWeight: 500 }}>{e.recipient}</span> },
    { key: 'subject', label: 'Předmět', render: (e) => <span className="text-muted text-sm">{e.subject ?? '—'}</span> },
    {
      key: 'status', label: 'Stav',
      render: (e) => {
        const cfg = STATUS_CONFIG[e.status] ?? { label: e.status, color: 'muted' as BadgeVariant }
        return (
          <div>
            <Badge variant={cfg.color}>{cfg.label}</Badge>
            {e.error && <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 2 }}>{e.error.slice(0, 80)}</div>}
          </div>
        )
      },
    },
    {
      key: 'createdAt', label: 'Datum',
      render: (e) => <span className="text-muted text-sm">{new Date(e.createdAt).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Komunikace</h1>
          <p className="page-subtitle">{outbox.length} záznamů v odchozí poště</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowSend(true)}>
          Odeslat zprávu
        </Button>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab-btn${tab === 'outbox' ? ' active' : ''}`} onClick={() => setTab('outbox')}>Odeslaná pošta</button>
        <button className={`tab-btn${tab === 'channels' ? ' active' : ''}`} onClick={() => setTab('channels')}>Kanály</button>
      </div>

      {tab === 'outbox' && (
        isLoading ? <LoadingState text="Načítání odchozí pošty..." /> :
        outbox.length === 0 ? <EmptyState title="Žádná odeslaná pošta" description="Zatím nebyla odeslána žádná zpráva." /> :
        <Table data={outbox} columns={columns} rowKey={(e) => e.id} />
      )}

      {tab === 'channels' && <ChannelStatusSection />}

      {showSend && (
        <SendMessageDialog
          recipient={{}}
          onClose={() => { setShowSend(false); qc.invalidateQueries({ queryKey: ['communication', 'outbox'] }); }}
        />
      )}
    </div>
  )
}
