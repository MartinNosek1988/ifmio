import { MessageSquare, RefreshCw, UserCheck, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ActivityVariant = 'comment' | 'status' | 'assignment' | 'sla_breach' | 'close' | 'create'

export interface TicketActivity {
  id: string
  variant: ActivityVariant
  content: string
  author: { name: string }
  createdAt: string
}

const VARIANT_ICONS: Record<ActivityVariant, LucideIcon> = {
  comment: MessageSquare,
  status: RefreshCw,
  assignment: UserCheck,
  sla_breach: AlertTriangle,
  close: CheckCircle2,
  create: Plus,
}

const VARIANT_COLORS: Record<ActivityVariant, string> = {
  comment: 'var(--text-secondary, #6b7280)',
  status: 'var(--primary, #0d9488)',
  assignment: 'var(--color-finance-positive, #16a34a)',
  sla_breach: 'var(--color-sla-breach, #dc2626)',
  close: 'var(--color-finance-positive, #16a34a)',
  create: 'var(--primary, #0d9488)',
}

function formatRelative(date: string): string {
  const d = new Date(date)
  const now = Date.now()
  const diff = now - d.getTime()
  const hours = diff / 3_600_000

  if (hours < 1) return `před ${Math.max(1, Math.floor(diff / 60_000))} min`
  if (hours < 24) return `před ${Math.floor(hours)} h`
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Initials({ name }: { name: string }) {
  const parts = name.split(' ')
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2)
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: 'var(--teal-50, #E6F5F3)', color: 'var(--teal, #0d9488)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
    }}>
      {initials.toUpperCase()}
    </div>
  )
}

interface Props {
  activities: TicketActivity[]
  emptyMessage?: string
}

export function TicketTimeline({ activities, emptyMessage = 'Žádná aktivita' }: Props) {
  if (activities.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{emptyMessage}</div>
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      {/* Vertical line */}
      <div style={{ position: 'absolute', left: 11, top: 4, bottom: 4, width: 1, background: 'var(--border, #e5e7eb)' }} />

      {activities.map((activity) => {
        const Icon = VARIANT_ICONS[activity.variant] || MessageSquare
        const color = VARIANT_COLORS[activity.variant] || 'var(--text-muted)'
        const isBreach = activity.variant === 'sla_breach'

        return (
          <div key={activity.id} style={{
            position: 'relative', marginBottom: 14,
            ...(isBreach ? { background: 'rgba(220,38,38,0.05)', borderRadius: 6, padding: '6px 8px', marginLeft: -8 } : {}),
          }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -24, top: 4, width: 22, height: 22,
              borderRadius: '50%', background: 'var(--surface, #fff)',
              border: `2px solid ${color}`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', color,
            }}>
              <Icon size={12} />
            </div>

            {/* Content */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Initials name={activity.author.name} />
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--dark)' }}>{activity.author.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} title={new Date(activity.createdAt).toLocaleString('cs-CZ')}>
                  {formatRelative(activity.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: isBreach ? 'var(--danger)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                {activity.content}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
