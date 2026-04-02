import { useState, type ReactNode, type DragEvent } from 'react'

interface KanbanColumn<T> {
  id: string
  title: string
  color?: string
  items: T[]
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[]
  renderCard: (item: T) => ReactNode
  getItemId: (item: T) => string
  onMove?: (itemId: string, fromColumn: string, toColumn: string) => void
  emptyMessage?: string
}

export function KanbanBoard<T>({
  columns,
  renderCard,
  getItemId,
  onMove,
  emptyMessage = 'Žádné položky',
}: KanbanBoardProps<T>) {
  const [draggedItem, setDraggedItem] = useState<{ id: string; fromColumn: string } | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const handleDragStart = (e: DragEvent, itemId: string, columnId: string) => {
    setDraggedItem({ id: itemId, fromColumn: columnId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }

  const handleDragOver = (e: DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => setDragOverColumn(null)

  const handleDrop = (e: DragEvent, toColumn: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (draggedItem && draggedItem.fromColumn !== toColumn) {
      onMove?.(draggedItem.id, draggedItem.fromColumn, toColumn)
    }
    setDraggedItem(null)
  }

  return (
    <div
      role="region"
      aria-label="Kanban nástěnka"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))`,
        gap: 12,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 4,
      }}
    >
      {columns.map((col) => (
        <div
          key={col.id}
          role="list"
          aria-label={col.title}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.id)}
          style={{
            background: dragOverColumn === col.id ? 'var(--primary-50, #f0fdfa)' : 'var(--gray-50)',
            borderRadius: 10,
            borderTop: `3px solid ${col.color || 'var(--gray-300)'}`,
            padding: 8,
            minHeight: 200,
            transition: 'background 0.15s',
          }}
        >
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 8px', marginBottom: 8,
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--dark)' }}>{col.title}</span>
            <span style={{
              background: 'var(--gray-200)', borderRadius: 9999,
              padding: '1px 8px', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)',
            }}>
              {col.items.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {col.items.length === 0 && (
              <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {emptyMessage}
              </div>
            )}
            {col.items.map((item) => {
              const id = getItemId(item)
              return (
                <div
                  key={id}
                  role="listitem"
                  draggable
                  onDragStart={(e) => handleDragStart(e, id, col.id)}
                  style={{
                    background: 'var(--color-surface, #fff)',
                    borderRadius: 8,
                    padding: 10,
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'grab',
                    opacity: draggedItem?.id === id ? 0.5 : 1,
                    transition: 'opacity 0.15s, box-shadow 0.15s',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
                >
                  {renderCard(item)}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
