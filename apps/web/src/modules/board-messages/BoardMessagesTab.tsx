import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pin, Plus, ChevronUp, Eye } from 'lucide-react'
import { boardMessagesApi, type BoardMessage } from './api'
import { Badge, Button, Modal, EmptyState, LoadingState, Table } from '../../shared/components'
import { FormField } from '../../shared/components/FormField'
import { useToast } from '../../shared/components/toast/Toast'
import type { Column } from '../../shared/components'

type StatusTab = 'PUBLISHED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ARCHIVED'

const STATUS_LABELS: Record<StatusTab, string> = {
  PUBLISHED: 'Publikované',
  PENDING_APPROVAL: 'Ke schválení',
  DRAFT: 'Koncepty',
  ARCHIVED: 'Archiv',
}

const TAG_VARIANTS: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'muted'> = {
  maintenance: 'yellow',
  finance: 'green',
  event: 'blue',
  urgent: 'red',
  general: 'muted',
}

export default function BoardMessagesTab({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<StatusTab>('PUBLISHED')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['board-messages', propertyId, activeTab],
    queryFn: () => boardMessagesApi.list(propertyId, { status: activeTab }),
  })
  const messages: BoardMessage[] = data?.data ?? data ?? []

  const { data: pendingData } = useQuery({
    queryKey: ['board-messages', propertyId, 'pending-count'],
    queryFn: () => boardMessagesApi.pendingCount(propertyId),
  })
  const pendingCount = pendingData?.count ?? 0

  const reviewMut = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: string; note?: string }) =>
      boardMessagesApi.review(propertyId, id, { decision, rejectionNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-messages', propertyId] })
      toast.success('Zpráva posouzena')
      setRejectingId(null)
      setRejectionNote('')
    },
  })

  const publishMut = useMutation({
    mutationFn: (id: string) => boardMessagesApi.publish(propertyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-messages', propertyId] })
      toast.success('Zpráva publikována')
    },
  })

  const archiveMut = useMutation({
    mutationFn: (id: string) => boardMessagesApi.archive(propertyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-messages', propertyId] })
      toast.success('Zpráva archivována')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => boardMessagesApi.remove(propertyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-messages', propertyId] })
      toast.success('Zpráva smazána')
    },
  })

  // Create form state
  const [form, setForm] = useState({ title: '', body: '', visibility: 'all', tags: '' as string, isPinned: false })

  const createMut = useMutation({
    mutationFn: () => boardMessagesApi.create(propertyId, {
      title: form.title,
      body: form.body,
      visibility: form.visibility,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      isPinned: form.isPinned,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-messages', propertyId] })
      toast.success('Zpráva vytvořena')
      setShowCreate(false)
      setForm({ title: '', body: '', visibility: 'all', tags: '', isPinned: false })
    },
  })

  const columns: Column<BoardMessage>[] = [
    {
      key: 'pin', label: '', width: 32,
      render: (row) => row.isPinned ? <Pin size={14} style={{ color: 'var(--primary)' }} /> : null,
    },
    { key: 'title', label: 'Název', render: (row) => <span style={{ fontWeight: 500 }}>{row.title}</span> },
    { key: 'author', label: 'Autor', render: (row) => row.author?.name ?? '-' },
    {
      key: 'date', label: 'Datum',
      render: (row) => new Date(row.createdAt).toLocaleDateString('cs-CZ'),
    },
    {
      key: 'tags', label: 'Štítky',
      render: (row) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {row.tags.map(tag => (
            <Badge key={tag} variant={TAG_VARIANTS[tag] ?? 'muted'}>{tag}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'reads', label: 'Přečteno', align: 'center' as const,
      render: (row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
          <Eye size={13} /> {row._count?.readReceipts ?? 0}
        </span>
      ),
    },
    ...(activeTab === 'PENDING_APPROVAL' ? [{
      key: 'actions' as const, label: 'Akce' as const,
      render: (row: BoardMessage) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="primary" onClick={(e: React.MouseEvent) => { e.stopPropagation(); reviewMut.mutate({ id: row.id, decision: 'PUBLISHED' }); }}>
            Schválit
          </Button>
          <Button size="sm" variant="danger" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRejectingId(row.id); }}>
            Zamítnout
          </Button>
        </div>
      ),
    }] : []),
    ...(activeTab === 'PUBLISHED' ? [{
      key: 'pubActions' as const, label: '' as const,
      render: (row: BoardMessage) => (
        <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); archiveMut.mutate(row.id); }}>
          Archivovat
        </Button>
      ),
    }] : []),
    ...(activeTab === 'DRAFT' ? [{
      key: 'draftActions' as const, label: '' as const,
      render: (row: BoardMessage) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="primary" onClick={(e: React.MouseEvent) => { e.stopPropagation(); publishMut.mutate(row.id); }}>
            Publikovat
          </Button>
          <Button size="sm" variant="danger" onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteMut.mutate(row.id); }}>
            Smazat
          </Button>
        </div>
      ),
    }] : []),
  ]

  return (
    <div data-testid="board-messages-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Nástěnka</h2>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>
          Nová zpráva
        </Button>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {(Object.keys(STATUS_LABELS) as StatusTab[]).map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {STATUS_LABELS[tab]}
            {tab === 'PENDING_APPROVAL' && pendingCount > 0 && (
              <span style={{
                background: 'var(--danger, #ef4444)', color: '#fff', borderRadius: 10,
                fontSize: '.65rem', fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center',
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : messages.length === 0 ? (
        <EmptyState
          title="Žádné zprávy"
          description={activeTab === 'PUBLISHED' ? 'Zatím nebyly publikovány žádné zprávy.' : undefined}
        />
      ) : (
        <Table
          data={messages}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
          data-testid="board-messages-table"
        />
      )}

      {/* Expanded detail */}
      {expandedId && (() => {
        const msg = messages.find((m: BoardMessage) => m.id === expandedId)
        if (!msg) return null
        return (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            padding: 20, marginTop: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{msg.title}</h3>
              <button onClick={() => setExpandedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <ChevronUp size={18} />
              </button>
            </div>
            <div style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{msg.body}</div>
            <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
              Autor: {msg.author?.name ?? '-'} | Vytvořeno: {new Date(msg.createdAt).toLocaleDateString('cs-CZ')}
              {msg.validFrom && ` | Platnost od: ${new Date(msg.validFrom).toLocaleDateString('cs-CZ')}`}
              {msg.validUntil && ` | Platnost do: ${new Date(msg.validUntil).toLocaleDateString('cs-CZ')}`}
            </div>
          </div>
        )
      })()}

      {/* Rejection modal */}
      <Modal open={!!rejectingId} onClose={() => { setRejectingId(null); setRejectionNote(''); }} title="Zamítnout zprávu">
        <FormField label="Důvod zamítnutí" name="rejectionNote">
          <textarea
            id="rejectionNote"
            className="input"
            value={rejectionNote}
            onChange={e => setRejectionNote(e.target.value)}
            rows={3}
            style={{ width: '100%' }}
          />
        </FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Button onClick={() => { setRejectingId(null); setRejectionNote(''); }}>Zrušit</Button>
          <Button variant="danger" onClick={() => {
            if (rejectingId) reviewMut.mutate({ id: rejectingId, decision: 'REJECTED', note: rejectionNote })
          }}>
            Zamítnout
          </Button>
        </div>
      </Modal>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nová zpráva na nástěnku">
        <FormField label="Název" name="create-title">
          <input id="create-title" className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </FormField>
        <FormField label="Text zprávy" name="create-body">
          <textarea id="create-body" className="input" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={5} style={{ width: '100%' }} />
        </FormField>
        <FormField label="Viditelnost" name="create-visibility" required={false}>
          <select id="create-visibility" className="input" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
            <option value="all">Všichni obyvatelé</option>
            <option value="owners_only">Pouze vlastníci</option>
            <option value="committee">Pouze výbor</option>
          </select>
        </FormField>
        <FormField label="Štítky" name="create-tags" required={false}>
          <input id="create-tags" className="input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="maintenance, finance, event" />
        </FormField>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', marginBottom: 12 }}>
          <input type="checkbox" checked={form.isPinned} onChange={e => setForm({ ...form, isPinned: e.target.checked })} />
          Připnout nahoru
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => setShowCreate(false)}>Zrušit</Button>
          <Button variant="primary" onClick={() => createMut.mutate()} disabled={!form.title || !form.body || createMut.isPending}>
            {createMut.isPending ? 'Vytvářím...' : 'Vytvořit'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
