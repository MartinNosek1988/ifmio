import { useState } from 'react'
import { useKanbanBoard, useCreateKanbanTask, useMoveCard } from './api/kanban.queries'
import { LoadingSpinner } from '../../shared/components'
import { Plus } from 'lucide-react'

interface KanbanCard {
  id: string; source: string; sourceId: string; title: string; description?: string
  status: string; priority: string; assignee?: { id: string; name: string }
  property?: { id: string; name: string }; dueDate?: string; tags: string[]
  sourceNumber?: string; createdAt: string; sortOrder: number
}

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', allowAdd: true },
  { key: 'todo', label: 'K řešení', allowAdd: true },
  { key: 'in_progress', label: 'V řešení', allowAdd: false },
  { key: 'review', label: 'Ke kontrole', allowAdd: false },
  { key: 'done', label: 'Hotovo', allowAdd: false },
]

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#9ca3af',
}
const SOURCE_CFG: Record<string, { emoji: string; bg: string; color: string }> = {
  helpdesk: { emoji: '🎫', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  workorder: { emoji: '🔧', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  task: { emoji: '📌', bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
}

export default function KanbanPage() {
  const [view, setView] = useState<string>('team')
  const params: Record<string, string> = {}
  if (view === 'my') params.view = 'my'
  if (view === 'team') params.view = 'team'

  const { data: board, isLoading } = useKanbanBoard(params)
  const moveMut = useMoveCard()
  const createMut = useCreateKanbanTask()
  const [addingIn, setAddingIn] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  if (isLoading) return <LoadingSpinner />

  const handleDrop = (e: React.DragEvent, toStatus: string) => {
    e.preventDefault()
    e.currentTarget.classList.remove('kanban-drag-over')
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.fromStatus !== toStatus) {
        moveMut.mutate({ cardId: data.cardId, source: data.source, sourceId: data.sourceId, newStatus: toStatus })
      }
    } catch { /* ignore */ }
  }

  const handleQuickAdd = (status: string) => {
    if (!newTitle.trim()) return
    createMut.mutate({ title: newTitle.trim(), status }, { onSuccess: () => { setNewTitle(''); setAddingIn(null) } })
  }

  return (
    <div data-testid="kanban-page">
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {['my', 'team'].map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: '.82rem', fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border)', background: view === v ? 'var(--primary, #6366f1)' : 'var(--surface)', color: view === v ? '#fff' : 'var(--text)' }}>
            {v === 'my' ? 'Moje úkoly' : 'Celý tým'}
          </button>
        ))}
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', height: 'calc(100vh - 180px)', paddingBottom: 8 }}>
        {COLUMNS.map(col => {
          const cards: KanbanCard[] = (board as any)?.[col.key] ?? []
          return (
            <div key={col.key}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('kanban-drag-over') }}
              onDragLeave={e => e.currentTarget.classList.remove('kanban-drag-over')}
              onDrop={e => handleDrop(e, col.key)}
              style={{ flex: '0 0 272px', background: 'var(--surface-2, var(--surface))', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
                <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{col.label}</span>
                <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', background: 'var(--border)', borderRadius: 10, padding: '1px 7px' }}>{cards.length}</span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cards.map(card => {
                  const src = SOURCE_CFG[card.source] ?? SOURCE_CFG.task
                  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date()
                  return (
                    <div key={card.id} draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ cardId: card.id, source: card.source, sourceId: card.sourceId, fromStatus: card.status }))
                        e.currentTarget.style.opacity = '0.5'
                      }}
                      onDragEnd={e => { e.currentTarget.style.opacity = '1' }}
                      style={{
                        background: 'var(--surface)', borderRadius: 8, padding: '10px 12px',
                        borderLeft: `3px solid ${PRIORITY_COLORS[card.priority] ?? '#9ca3af'}`,
                        cursor: 'grab', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      {/* Source badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: 4, fontWeight: 600, background: src.bg, color: src.color }}>
                          {src.emoji} {card.sourceNumber ?? card.source}
                        </span>
                        {isOverdue && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>⏰</span>}
                      </div>
                      {/* Title */}
                      <div style={{ fontSize: '.84rem', fontWeight: 500, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {card.title}
                      </div>
                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{card.property?.name ?? ''}</span>
                        {card.assignee && (
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--primary, #6366f1)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {card.assignee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Quick add */}
              {col.allowAdd && (
                <div style={{ marginTop: 6 }}>
                  {addingIn === col.key ? (
                    <div>
                      <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(col.key); if (e.key === 'Escape') setAddingIn(null) }}
                        placeholder="Název úkolu..."
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.82rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  ) : (
                    <button onClick={() => setAddingIn(col.key)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={13} /> Přidat
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        .kanban-drag-over { background: rgba(99,102,241,0.06) !important; outline: 2px dashed rgba(99,102,241,0.3); }
      `}</style>
    </div>
  )
}
