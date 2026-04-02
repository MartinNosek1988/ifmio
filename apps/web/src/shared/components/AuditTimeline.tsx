import { PiiBadge } from './PiiField'
import { Plus, Pencil, Trash2, RefreshCw, UserCheck, MessageSquare, Upload } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuditChange {
  field: string
  oldValue: string | null
  newValue: string | null
  isPii?: boolean
}

interface AuditEntry {
  id: string
  timestamp: Date | string
  userName: string
  action: string
  entityType?: string
  changes?: AuditChange[]
}

interface AuditTimelineProps {
  entries: AuditEntry[]
  isLoading?: boolean
  emptyMessage?: string
  maxEntries?: number
}

const ACTION_ICONS: Record<string, ReactNode> = {
  create: <Plus size={14} />,
  update: <Pencil size={14} />,
  delete: <Trash2 size={14} />,
  statusChange: <RefreshCw size={14} />,
  assign: <UserCheck size={14} />,
  comment: <MessageSquare size={14} />,
  upload: <Upload size={14} />,
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Vytvořil',
  update: 'Upravil',
  delete: 'Smazal',
  statusChange: 'Změnil stav',
  assign: 'Přiřadil',
  comment: 'Komentoval',
  upload: 'Nahrál dokument',
  archive: 'Archivoval',
  approve: 'Schválil',
  LOGIN: 'Přihlášení',
  LOGOUT: 'Odhlášení',
}

function formatRelative(date: Date | string): string {
  const d = new Date(date)
  const now = Date.now()
  const diff = now - d.getTime()
  const hours = diff / 3_600_000

  if (hours < 1) return `před ${Math.max(1, Math.floor(diff / 60_000))} min`
  if (hours < 24) return `před ${Math.floor(hours)} h`
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AuditTimeline({
  entries,
  isLoading,
  emptyMessage = 'Žádná historie změn',
  maxEntries = 50,
}: AuditTimelineProps) {
  if (isLoading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Načítání historie...
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {emptyMessage}
      </div>
    )
  }

  const visible = entries.slice(0, maxEntries)

  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 7, top: 4, bottom: 4, width: 2,
        background: 'var(--gray-200)',
      }} />

      {visible.map((entry) => {
        const icon = ACTION_ICONS[entry.action] || <Pencil size={14} />
        const label = ACTION_LABELS[entry.action] || entry.action

        return (
          <div key={entry.id} style={{ position: 'relative', marginBottom: 16 }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -20, top: 4, width: 16, height: 16,
              borderRadius: '50%', background: 'var(--color-surface, #fff)',
              border: '2px solid var(--primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
            }}>
              {icon}
            </div>

            {/* Content */}
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                {formatRelative(entry.timestamp)} — <strong style={{ color: 'var(--text-secondary)' }}>{entry.userName}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--dark)', fontWeight: 500 }}>
                {label} {entry.entityType ? getEntityLabel(entry.entityType) : ''}
              </div>

              {/* Changes diff */}
              {entry.changes && entry.changes.length > 0 && (
                <div style={{
                  marginTop: 6, padding: '6px 10px', background: 'var(--gray-50)',
                  borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.78rem',
                }}>
                  {entry.changes.map((ch, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                      {ch.isPii && <PiiBadge size="sm" />}
                      <span style={{ color: 'var(--text-secondary)' }}>{ch.field}:</span>
                      {ch.oldValue && (
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{ch.oldValue}</span>
                      )}
                      {ch.oldValue && ch.newValue && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                      {ch.newValue && (
                        <span style={{ fontWeight: 500, color: 'var(--dark)' }}>{ch.newValue}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {entries.length > maxEntries && (
        <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--primary)', cursor: 'pointer', padding: '8px 0' }}>
          Zobrazit starší ({entries.length - maxEntries} dalších)
        </div>
      )}
    </div>
  )
}

function getEntityLabel(entityType: string): string {
  const map: Record<string, string> = {
    property: 'nemovitost', unit: 'jednotku', resident: 'osobu',
    invoice: 'doklad', prescription: 'předpis', ticket: 'požadavek',
    workOrder: 'pracovní příkaz', asset: 'zařízení', meter: 'měřidlo',
    document: 'dokument', protocol: 'protokol', bankAccount: 'bankovní účet',
  }
  return map[entityType] || entityType
}
