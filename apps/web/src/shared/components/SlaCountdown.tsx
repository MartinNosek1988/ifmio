import { useState, useEffect } from 'react'

interface SlaCountdownProps {
  deadline: string | null
  status: string
  completedAt?: string | null
  compact?: boolean
}

function formatDuration(ms: number): string {
  const abs = Math.abs(ms)
  const days = Math.floor(abs / 86400000)
  const hours = Math.floor((abs % 86400000) / 3600000)
  const mins = Math.floor((abs % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

const RESOLVED_STATUSES = ['vyresena', 'uzavrena', 'zrusena', 'resolved', 'closed', 'completed']

export function SlaCountdown({ deadline, status, completedAt, compact = false }: SlaCountdownProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!deadline || RESOLVED_STATUSES.includes(status)) return
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [deadline, status])

  if (!deadline) return null

  const resolved = RESOLVED_STATUSES.includes(status)
  const dl = new Date(deadline).getTime()

  if (resolved) {
    if (completedAt) {
      const wasOnTime = new Date(completedAt).getTime() <= dl
      return (
        <span style={{ fontSize: compact ? '.72rem' : '.82rem', color: wasOnTime ? 'var(--success, #22c55e)' : '#f59e0b' }}>
          {wasOnTime ? '✓ Včas' : '⚠ Po SLA'}
        </span>
      )
    }
    return (
      <span style={{ fontSize: compact ? '.72rem' : '.82rem', color: 'var(--text-muted)' }}>
        ✓ Uzavřeno
      </span>
    )
  }

  const remaining = dl - now

  if (remaining <= 0) {
    return (
      <span style={{ fontSize: compact ? '.72rem' : '.82rem', color: '#ef4444', fontWeight: 600 }}>
        Překročeno o {formatDuration(-remaining)}
      </span>
    )
  }

  const total = dl - new Date().setHours(0, 0, 0, 0)
  const pct = total > 0 ? remaining / total : 1
  const color = pct > 0.5 ? 'var(--success, #22c55e)' : pct > 0.1 ? '#f59e0b' : '#ef4444'

  return (
    <span style={{ fontSize: compact ? '.72rem' : '.82rem', color, fontWeight: pct < 0.1 ? 600 : 400 }}>
      {formatDuration(remaining)}
    </span>
  )
}
