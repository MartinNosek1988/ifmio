import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Modal, Button, Badge } from '../../shared/components'
import { apiClient } from '../../core/api/client'

interface Recipient {
  name?: string
  email?: string
  phone?: string
  dataBoxId?: string
  address?: { name: string; street: string; city: string; zip: string }
}

interface Props {
  recipient: Recipient
  defaultSubject?: string
  defaultBody?: string
  onClose: () => void
}

interface ChannelStatus {
  channel: string
  label: string
  configured: boolean
}

const CHANNEL_REQUIREMENTS: Record<string, (r: Recipient) => string | null> = {
  email: r => r.email ? null : 'Příjemce nemá e-mail',
  sms: r => r.phone?.startsWith('+') ? null : 'Příjemce nemá telefon (+420...)',
  whatsapp: r => r.phone?.startsWith('+') ? null : 'Příjemce nemá telefon (+420...)',
  letter: r => r.address?.street ? null : 'Příjemce nemá adresu',
  isds: r => r.dataBoxId ? null : 'Příjemce nemá datovou schránku',
}

const CHANNEL_DETAIL: Record<string, (r: Recipient) => string> = {
  email: r => r.email ?? '',
  sms: r => r.phone ?? '',
  whatsapp: r => r.phone ?? '',
  letter: r => r.address ? `${r.address.street}, ${r.address.city}` : '',
  isds: r => r.dataBoxId ?? '',
}

export function SendMessageDialog({ recipient, defaultSubject, defaultBody, onClose }: Props) {
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(recipient.email ? ['email'] : []))
  const [subject, setSubject] = useState(defaultSubject ?? '')
  const [bodyText, setBodyText] = useState(defaultBody ?? '')

  const { data: channelStatuses = [] } = useQuery<ChannelStatus[]>({
    queryKey: ['communication', 'channels'],
    queryFn: () => apiClient.get('/communication/channels').then(r => r.data),
  })

  const sendMutation = useMutation({
    mutationFn: () => apiClient.post('/communication/send', {
      channels: Array.from(selectedChannels),
      recipient,
      subject,
      bodyText,
    }).then(r => r.data),
  })

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev => {
      const next = new Set(prev)
      if (next.has(ch)) next.delete(ch); else next.add(ch)
      return next
    })
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }

  const results = sendMutation.data as Array<{ channel: string; success: boolean; error?: string }> | undefined

  return (
    <Modal open onClose={onClose} title="Odeslat zprávu"
      subtitle={recipient.name ?? recipient.email ?? ''}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zavřít</Button>
        {!results && (
          <Button variant="primary" onClick={() => sendMutation.mutate()} disabled={selectedChannels.size === 0 || !subject || sendMutation.isPending}>
            {sendMutation.isPending ? 'Odesílám...' : 'Odeslat'}
          </Button>
        )}
      </div>}
    >
      {/* Results after send */}
      {results && (
        <div style={{ marginBottom: 16 }}>
          {results.map((r: any) => (
            <div key={r.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: '.85rem' }}>
              <span style={{ color: r.success ? 'var(--accent-green, #22c55e)' : 'var(--danger, #ef4444)' }}>
                {r.success ? '✓' : '✗'}
              </span>
              <span style={{ fontWeight: 500 }}>{channelStatuses.find(cs => cs.channel === r.channel)?.label ?? r.channel}</span>
              {r.error && <span className="text-muted text-sm">— {r.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Channel selection */}
      {!results && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Kanály</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {channelStatuses.map(cs => {
                const reqError = CHANNEL_REQUIREMENTS[cs.channel]?.(recipient) ?? null
                const disabled = !cs.configured || !!reqError
                const detail = CHANNEL_DETAIL[cs.channel]?.(recipient) ?? ''
                return (
                  <label key={cs.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }}
                    title={!cs.configured ? 'Nenastaveno' : reqError ?? undefined}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChannels.has(cs.channel)}
                      onChange={() => toggleChannel(cs.channel)}
                      disabled={disabled}
                    />
                    <span style={{ fontWeight: 500 }}>{cs.label}</span>
                    {detail && <span className="text-muted text-sm">({detail})</span>}
                    {!cs.configured && <Badge variant="muted">nenastaveno</Badge>}
                  </label>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Předmět</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Zpráva</label>
            <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </>
      )}
    </Modal>
  )
}
