import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Send } from 'lucide-react'
import { Table, Badge, Button, LoadingState, EmptyState, Modal } from '../../shared/components'
import type { Column, BadgeVariant } from '../../shared/components'
import { communicationApi, type OutboxEntry } from './api/communication.api'
import { ChannelStatusSection } from './ChannelStatusSection'
import { SendMessageDialog } from './SendMessageDialog'
import { apiClient } from '../../core/api/client'

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

type Tab = 'sent' | 'compose' | 'channels'

interface ChannelStatus {
  channel: string
  label: string
  configured: boolean
}

const CHANNEL_REQUIREMENTS: Record<string, (r: ComposeRecipient) => string | null> = {
  email: r => r.email ? null : 'Příjemce nemá e-mail',
  sms: r => r.phone?.startsWith('+') ? null : 'Příjemce nemá telefon (+420...)',
  whatsapp: r => r.phone?.startsWith('+') ? null : 'Příjemce nemá telefon (+420...)',
  letter: () => null,
  isds: () => null,
}

interface ComposeRecipient {
  name?: string
  email?: string
  phone?: string
}

/* ─── Inline Compose Form ────────────────────────────────────── */
function ComposeForm({ onSent }: { onSent: () => void }) {
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(['email']))
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')

  const { data: channelStatuses = [] } = useQuery<ChannelStatus[]>({
    queryKey: ['communication', 'channels'],
    queryFn: () => apiClient.get('/communication/channels').then(r => r.data),
  })

  const sendMutation = useMutation({
    mutationFn: () => apiClient.post('/communication/send', {
      channels: Array.from(selectedChannels),
      recipient: { email: recipientEmail },
      subject,
      bodyText,
    }).then(r => r.data),
    onSuccess: () => onSent(),
  })

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev => {
      const next = new Set(prev)
      if (next.has(ch)) next.delete(ch); else next.add(ch)
      return next
    })
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }

  const results = sendMutation.data as Array<{ channel: string; success: boolean; error?: string }> | undefined

  return (
    <div className="card" style={{ maxWidth: 680, padding: 24 }}>
      {results ? (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 600 }}>Výsledek odeslání</h3>
          {results.map((r: { channel: string; success: boolean; error?: string }) => (
            <div key={r.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: '.85rem' }}>
              <span style={{ color: r.success ? 'var(--accent-green, #22c55e)' : 'var(--danger, #ef4444)' }}>
                {r.success ? '✓' : '✗'}
              </span>
              <span style={{ fontWeight: 500 }}>{channelStatuses.find(cs => cs.channel === r.channel)?.label ?? r.channel}</span>
              {r.error && <span className="text-muted text-sm">— {r.error}</span>}
            </div>
          ))}
          <Button style={{ marginTop: 16 }} onClick={() => { sendMutation.reset(); setSubject(''); setBodyText(''); setRecipientEmail(''); }}>
            Nová zpráva
          </Button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Kanály</label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {channelStatuses.map(cs => {
                const disabled = !cs.configured
                return (
                  <label key={cs.channel} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }}
                    title={!cs.configured ? 'Nenastaveno' : undefined}
                  >
                    <input type="checkbox" checked={selectedChannels.has(cs.channel)} onChange={() => toggleChannel(cs.channel)} disabled={disabled} />
                    <span style={{ fontWeight: 500 }}>{cs.label}</span>
                    {!cs.configured && <Badge variant="muted">nenastaveno</Badge>}
                  </label>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Příjemce (e-mail)</label>
            <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="jan.novak@example.cz" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Předmět</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Zpráva</label>
            <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant="primary" icon={<Send size={15} />} onClick={() => sendMutation.mutate()} disabled={selectedChannels.size === 0 || !subject || !recipientEmail || sendMutation.isPending}>
              {sendMutation.isPending ? 'Odesílám...' : 'Odeslat'}
            </Button>
            <Link to="/mass-mailing" style={{ fontSize: '.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              Hromadné kampaně →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function CommunicationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') ?? 'sent') as Tab
  const [showSend, setShowSend] = useState(false)
  const qc = useQueryClient()

  const setTab = (t: Tab) => setSearchParams({ tab: t })

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
    <div data-testid="communication-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Komunikace</h1>
          <p className="page-subtitle">
            {tab === 'sent' && `${outbox.length} záznamů v odchozí poště`}
            {tab === 'compose' && 'Napište novou zprávu'}
            {tab === 'channels' && 'Stav komunikačních kanálů'}
          </p>
        </div>
        {tab === 'sent' && (
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowSend(true)}>
            Odeslat zprávu
          </Button>
        )}
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab-btn${tab === 'sent' ? ' active' : ''}`} onClick={() => setTab('sent')}>Odeslaná pošta</button>
        <button className={`tab-btn${tab === 'compose' ? ' active' : ''}`} onClick={() => setTab('compose')}>Napsat zprávu</button>
        <button className={`tab-btn${tab === 'channels' ? ' active' : ''}`} onClick={() => setTab('channels')}>Kanály</button>
      </div>

      {tab === 'sent' && (
        isLoading ? <LoadingState text="Načítání odchozí pošty..." /> :
        outbox.length === 0 ? <EmptyState title="Žádná odeslaná pošta" description="Zatím nebyla odeslána žádná zpráva." /> :
        <Table data={outbox} columns={columns} rowKey={(e) => e.id} />
      )}

      {tab === 'compose' && (
        <ComposeForm onSent={() => { qc.invalidateQueries({ queryKey: ['communication', 'outbox'] }); setTab('sent'); }} />
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
