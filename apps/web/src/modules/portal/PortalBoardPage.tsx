import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, ChevronDown, ChevronUp, Circle, AlertTriangle, Edit3 } from 'lucide-react'
import { boardMessagesApi, type BoardMessage } from '../board-messages/api'
import { Badge, Button, Modal, EmptyState, LoadingState } from '../../shared/components'
import { FormField } from '../../shared/components/FormField'
import { useToast } from '../../shared/components/toast/Toast'

type Section = 'feed' | 'mine'

export default function PortalBoardPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [section, setSection] = useState<Section>('feed')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editMsg, setEditMsg] = useState<BoardMessage | null>(null)

  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['portal', 'board-messages'],
    queryFn: boardMessagesApi.portalFeed,
  })
  const feed: BoardMessage[] = feedData?.data ?? feedData ?? []

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ['portal', 'board-messages', 'mine'],
    queryFn: boardMessagesApi.portalMyMessages,
  })
  const myMessages: BoardMessage[] = myData?.data ?? myData ?? []

  const markReadMut = useMutation({
    mutationFn: (id: string) => boardMessagesApi.portalMarkRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'board-messages'] })
    },
  })

  const handleExpand = (msg: BoardMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null)
    } else {
      setExpandedId(msg.id)
      if (!msg.isRead) {
        markReadMut.mutate(msg.id)
      }
    }
  }

  // Create / edit form
  const [form, setForm] = useState({ title: '', body: '' })

  const createMut = useMutation({
    mutationFn: () =>
      editMsg
        ? boardMessagesApi.portalUpdate(editMsg.id, { title: form.title, body: form.body, submitForApproval: true })
        : boardMessagesApi.portalCreate(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'board-messages'] })
      queryClient.invalidateQueries({ queryKey: ['portal', 'board-messages', 'mine'] })
      toast.success(editMsg ? 'Zpráva aktualizována' : 'Zpráva odeslána ke schválení')
      setShowCreate(false)
      setEditMsg(null)
      setForm({ title: '', body: '' })
    },
  })

  // Published feed messages (portal feed already returns only PUBLISHED)
  const published = feed

  const openEdit = (msg: BoardMessage) => {
    setEditMsg(msg)
    setForm({ title: msg.title, body: msg.body })
    setShowCreate(true)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'blue' | 'green' | 'yellow' | 'red' | 'muted'; label: string }> = {
      DRAFT: { variant: 'muted', label: 'Koncept' },
      PENDING_APPROVAL: { variant: 'yellow', label: 'Čeká na schválení' },
      REJECTED: { variant: 'red', label: 'Zamítnuto' },
      PUBLISHED: { variant: 'green', label: 'Publikováno' },
      ARCHIVED: { variant: 'muted', label: 'Archivováno' },
    }
    const s = map[status] ?? { variant: 'muted' as const, label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  return (
    <div data-testid="portal-board-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Megaphone size={22} style={{ color: 'var(--primary)' }} />
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Nástěnka</h1>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setEditMsg(null); setForm({ title: '', body: '' }); setShowCreate(true); }}>
          Nová zpráva
        </Button>
      </div>

      {/* Section toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <button className={`tab-btn${section === 'feed' ? ' active' : ''}`} onClick={() => setSection('feed')}>
          Zprávy
        </button>
        <button className={`tab-btn${section === 'mine' ? ' active' : ''}`} onClick={() => setSection('mine')}>
          Moje zprávy
        </button>
      </div>

      {section === 'feed' && (
        feedLoading ? <LoadingState /> :
        published.length === 0 ? (
          <EmptyState title="Žádné zprávy" description="Na nástěnku zatím nebyly přidány žádné zprávy." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(published as BoardMessage[]).map(msg => (
              <div
                key={msg.id}
                onClick={() => handleExpand(msg)}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${!msg.isRead ? 'var(--primary, #6366f1)' : 'var(--border)'}`,
                  borderRadius: 10,
                  padding: '14px 18px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {!msg.isRead && <Circle size={8} fill="var(--primary)" stroke="none" />}
                  {msg.isPinned && <span title="Připnuto" style={{ color: 'var(--primary)' }}>&#128204;</span>}
                  <span style={{ flex: 1, fontWeight: msg.isRead ? 400 : 600, fontSize: '.92rem' }}>{msg.title}</span>
                  <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                    {new Date(msg.createdAt).toLocaleDateString('cs-CZ')}
                  </span>
                  {expandedId === msg.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {msg.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    {msg.tags.map(t => <Badge key={t} variant="muted">{t}</Badge>)}
                  </div>
                )}
                {expandedId === msg.id && (
                  <div style={{ marginTop: 12, fontSize: '.9rem', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                    {msg.body}
                    <div style={{ marginTop: 8, fontSize: '.78rem', color: 'var(--text-muted)' }}>
                      Autor: {msg.author?.name ?? '-'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {section === 'mine' && (
        myLoading ? <LoadingState /> :
        myMessages.length === 0 ? (
          <EmptyState title="Žádné vlastní zprávy" description="Zatím jste neodeslali žádnou zprávu." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(myMessages as BoardMessage[]).map(msg => (
              <div
                key={msg.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '14px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '.92rem' }}>{msg.title}</span>
                  {statusBadge(msg.status)}
                </div>
                {msg.status === 'REJECTED' && msg.rejectionNote && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: '.85rem',
                  }}>
                    <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>Důvod zamítnutí:</div>
                      {msg.rejectionNote}
                    </div>
                  </div>
                )}
                {msg.status === 'REJECTED' && (
                  <Button size="sm" icon={<Edit3 size={13} />} onClick={() => openEdit(msg)}>
                    Upravit a znovu odeslat
                  </Button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Create / Edit modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditMsg(null); }}
        title={editMsg ? 'Upravit zprávu' : 'Nová zpráva'}
      >
        <FormField label="Název" name="portal-msg-title">
          <input
            id="portal-msg-title"
            className="input"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </FormField>
        <FormField label="Text zprávy" name="portal-msg-body">
          <textarea
            id="portal-msg-body"
            className="input"
            value={form.body}
            onChange={e => setForm({ ...form, body: e.target.value })}
            rows={5}
            style={{ width: '100%' }}
          />
        </FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Button onClick={() => { setShowCreate(false); setEditMsg(null); }}>Zrušit</Button>
          <Button
            variant="primary"
            onClick={() => createMut.mutate()}
            disabled={!form.title || !form.body || createMut.isPending}
          >
            {createMut.isPending ? 'Odesílám...' : editMsg ? 'Upravit a odeslat' : 'Odeslat'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
