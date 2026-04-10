import { useState } from 'react'
import { useMyMessages, useSendMessage, useMarkMessageRead } from './api/portal.queries'
import { Badge, Button, Modal, LoadingSpinner } from '../../shared/components'
import { FormField } from '../../shared/components/FormField'
import { Plus, Mail, MailOpen } from 'lucide-react'

export default function PortalMessagesPage() {
  const { data: messages = [], isLoading } = useMyMessages()
  const sendMut = useSendMessage()
  const markReadMut = useMarkMessageRead()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  if (isLoading) return <LoadingSpinner />

  const handleExpand = (msg: any) => {
    setExpanded(expanded === msg.id ? null : msg.id)
    if (!msg.isRead && msg.direction === 'outbound') {
      markReadMut.mutate(msg.id)
    }
  }

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) return
    sendMut.mutate({ subject, body }, {
      onSuccess: () => { setShowCompose(false); setSubject(''); setBody('') },
    })
  }

  return (
    <div data-testid="portal-messages-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Zprávy</h1>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowCompose(true)}>
          Napsat zprávu
        </Button>
      </div>

      {messages.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <Mail size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>Žádné zprávy</div>
        </div>
      )}

      {messages.map((msg: any) => (
        <div
          key={msg.id}
          onClick={() => handleExpand(msg)}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
            borderLeft: !msg.isRead && msg.direction === 'outbound' ? '3px solid var(--primary, #6366f1)' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {msg.isRead ? <MailOpen size={14} style={{ color: 'var(--text-muted)' }} /> : <Mail size={14} style={{ color: 'var(--primary)' }} />}
              <span style={{ fontWeight: msg.isRead ? 400 : 600, fontSize: '0.9rem' }}>{msg.subject}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge variant={msg.direction === 'outbound' ? 'blue' : 'muted'}>
                {msg.direction === 'outbound' ? 'Od správce' : 'Odesláno'}
              </Badge>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {new Date(msg.createdAt).toLocaleDateString('cs-CZ')}
              </span>
            </div>
          </div>
          {expanded === msg.id && (
            <div style={{ marginTop: 10, padding: '10px 0 0', borderTop: '1px solid var(--border)', fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>
              {msg.body}
            </div>
          )}
        </div>
      ))}

      {showCompose && (
        <Modal open onClose={() => setShowCompose(false)} title="Nová zpráva správci">
          <FormField label="Předmět" name="subject">
            <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Předmět zprávy" />
          </FormField>
          <FormField label="Zpráva" name="body">
            <textarea className="input" rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Text zprávy..." style={{ resize: 'vertical' }} />
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button onClick={() => setShowCompose(false)}>Zrušit</Button>
            <Button variant="primary" onClick={handleSend} disabled={sendMut.isPending || !subject.trim() || !body.trim()}>
              {sendMut.isPending ? 'Odesílám...' : 'Odeslat'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
