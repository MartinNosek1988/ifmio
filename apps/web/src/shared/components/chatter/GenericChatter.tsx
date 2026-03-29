import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { apiClient } from '../../../core/api/client'

interface Message {
  id: string
  type: 'USER_MESSAGE' | 'SYSTEM_LOG'
  body: string
  authorId: string | null
  author: { id: string; name: string } | null
  createdAt: string
}

interface Activity {
  id: string
  title: string
  note: string | null
  deadline: string
  status: string
  activityType: { name: string; icon: string | null; kind: string }
  assignedTo: { id: string; name: string }
}

interface GenericChatterProps {
  entityType: 'Invoice' | 'WorkOrder' | 'HelpdeskTicket' | 'Tenancy'
  entityId: string
  showActivities?: boolean
  readOnly?: boolean
  className?: string
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
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
  const y = new Date(today); y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'včera'
  return d.toLocaleDateString('cs', { day: 'numeric', month: 'long', year: 'numeric' })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

export function GenericChatter({ entityType, entityId, showActivities = true, readOnly = false }: GenericChatterProps) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [activitiesOpen, setActivitiesOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useQuery<{ messages: Message[]; activities: Activity[] }>({
    queryKey: ['chatter', entityType, entityId],
    queryFn: () => apiClient.get(`/chatter/${entityType}/${entityId}`).then(r => r.data),
    enabled: !!entityId,
    retry: 1,
  })

  const messages = data?.messages ?? []
  const activities = (data?.activities ?? []).filter(a => a.status === 'PLANNED' || a.status === 'OVERDUE')

  const addMut = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/chatter/${entityType}/${entityId}/messages`, { body }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chatter', entityType, entityId] }); setText('') },
  })

  const completeMut = useMutation({
    mutationFn: (activityId: string) =>
      apiClient.patch(`/activities/${activityId}/complete`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chatter', entityType, entityId] }),
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || addMut.isPending) return
    addMut.mutate(trimmed)
  }

  if (isLoading) return <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '.82rem' }}>Načítám komunikaci...</div>
  if (isError) return <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '.82rem' }}>Komunikace bude brzy dostupná.</div>

  let lastDate = ''

  return (
    <div style={{ marginTop: 16 }}>
      {/* Activities section */}
      {showActivities && activities.length > 0 && (
        <div style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => setActivitiesOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', background: 'var(--surface-2, var(--surface))', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600, color: 'var(--text)' }}>
            <Clock size={14} /> Nadcházející aktivity ({activities.length})
            <span style={{ flex: 1 }} />
            {activitiesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {activitiesOpen && (
            <div style={{ padding: '4px 12px 8px' }}>
              {activities.map(a => {
                const overdue = new Date(a.deadline) < new Date() && a.status !== 'DONE'
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '.82rem' }}>
                    <button onClick={() => completeMut.mutate(a.id)} disabled={completeMut.isPending} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--primary, #1D9E75)' }}>
                      <CheckCircle size={16} />
                    </button>
                    <span>{a.activityType.icon ?? '📌'}</span>
                    <span style={{ flex: 1, textDecoration: a.status === 'DONE' ? 'line-through' : 'none' }}>{a.title}</span>
                    <span style={{ fontSize: '.75rem', color: overdue ? '#ef4444' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
                      {new Date(a.deadline).toLocaleDateString('cs', { day: 'numeric', month: 'short' })}
                    </span>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.assignedTo.name}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Message input */}
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="Napište zprávu..." rows={2}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', fontSize: '.84rem', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <button onClick={handleSubmit} disabled={!text.trim() || addMut.isPending}
            style={{ alignSelf: 'flex-end', padding: '8px 14px', borderRadius: 6, border: 'none', background: 'var(--primary, #1D9E75)', color: '#fff', cursor: 'pointer', opacity: !text.trim() ? 0.5 : 1 }}>
            <Send size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {messages.length === 0 && (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.82rem' }}>
            Zatím žádná komunikace.
          </div>
        )}
        {messages.map(m => {
          const dateKey = dateSeparator(m.createdAt)
          const showSep = dateKey !== lastDate
          lastDate = dateKey

          const separator = showSep && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px', color: 'var(--text-muted)', fontSize: '.75rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span>{dateKey}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
          )

          if (m.type === 'SYSTEM_LOG') {
            return (
              <div key={m.id}>
                {separator}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  <span style={{ fontSize: '.72rem' }}>{relativeTime(m.createdAt)}</span>
                  <span>{m.body}</span>
                </div>
              </div>
            )
          }

          const name = m.author?.name ?? 'Systém'
          return (
            <div key={m.id}>
              {separator}
              <div style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--primary, #1D9E75)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 600 }}>
                  {initials(name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '.84rem' }}>{name}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{relativeTime(m.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: '.84rem', marginTop: 2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>
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
