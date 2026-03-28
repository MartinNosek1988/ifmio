import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { apiClient } from '../../../core/api/client'

interface Comment {
  id: string
  userId: string
  userName: string
  userInitials: string
  body: string
  type: 'note' | 'log'
  createdAt: string
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'právě teď'
  if (mins < 60) return `před ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return d.toLocaleTimeString('cs', { hour: '2-digit', minute: '2-digit' })
  const days = Math.floor(hours / 24)
  if (days === 1) return 'včera ' + d.toLocaleTimeString('cs', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('cs', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('cs', { hour: '2-digit', minute: '2-digit' })
}

function dateSeparator(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'dnes'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'včera'
  return d.toLocaleDateString('cs', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function InvoiceChatter({ invoiceId }: { invoiceId: string }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [tab, setTab] = useState<'note' | 'message' | 'activity'>('note')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['invoice-comments', invoiceId],
    queryFn: () => apiClient.get(`/finance/invoices/${invoiceId}/comments`).then(r => r.data),
    enabled: !!invoiceId,
  })

  const addMut = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/finance/invoices/${invoiceId}/comments`, { body, type: 'note' }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice-comments', invoiceId] })
      setText('')
    },
  })

  // Auto-scroll on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || addMut.isPending) return
    addMut.mutate(trimmed)
  }

  // Group comments by date
  let lastDate = ''

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: '.82rem',
    fontWeight: 500, background: 'none',
    color: active ? 'var(--primary, #1D9E75)' : 'var(--text-muted)',
    borderBottom: active ? '2px solid var(--primary, #1D9E75)' : '2px solid transparent',
  })

  return (
    <div style={{ marginTop: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        <button onClick={() => setTab('note')} style={tabStyle(tab === 'note')}>Zapsat poznámku</button>
        <button onClick={() => setTab('message')} style={tabStyle(tab === 'message')}>Odeslat zprávu</button>
        <button onClick={() => setTab('activity')} style={tabStyle(tab === 'activity')}>Aktivita</button>
      </div>

      {/* Input area */}
      {tab === 'note' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="Zapsat interní poznámku..."
            rows={2}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
              fontSize: '.84rem', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || addMut.isPending}
            style={{
              alignSelf: 'flex-end', padding: '8px 14px', borderRadius: 6,
              border: 'none', background: 'var(--primary, #1D9E75)', color: '#fff',
              cursor: 'pointer', fontSize: '.82rem', fontWeight: 500,
              opacity: !text.trim() ? 0.5 : 1,
            }}
          >
            <Send size={14} />
          </button>
        </div>
      )}

      {tab === 'message' && (
        <div style={{ padding: '12px 0', fontSize: '.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Funkce odesílání emailů bude brzy k dispozici.
        </div>
      )}

      {tab === 'activity' && (
        <div style={{ padding: '12px 0', fontSize: '.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Plánování aktivit bude k dispozici v další verzi.
        </div>
      )}

      {/* Comments list */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {comments.length === 0 && (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.82rem' }}>
            Zatím žádné komentáře.
          </div>
        )}

        {comments.map(c => {
          const dateKey = dateSeparator(c.createdAt)
          const showSeparator = dateKey !== lastDate
          lastDate = dateKey

          if (c.type === 'log') {
            return (
              <div key={c.id}>
                {showSeparator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px', color: 'var(--text-muted)', fontSize: '.75rem' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span>{dateKey}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  <span style={{ fontSize: '.72rem' }}>{relativeTime(c.createdAt)}</span>
                  <span>{c.body}</span>
                </div>
              </div>
            )
          }

          return (
            <div key={c.id}>
              {showSeparator && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px', color: 'var(--text-muted)', fontSize: '.75rem' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span>{dateKey}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--primary, #1D9E75)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.72rem', fontWeight: 600,
                }}>
                  {c.userInitials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '.84rem' }}>{c.userName}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{relativeTime(c.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: '.84rem', marginTop: 2, lineHeight: 1.5 }}>{c.body}</div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
