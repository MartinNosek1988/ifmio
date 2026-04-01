import { useState, useEffect } from 'react'
import { Check, AlertTriangle, Clock } from 'lucide-react'

interface SlaBadgeProps {
  dueAt: Date | string | null
  resolvedAt?: Date | string | null
  type?: 'response' | 'resolution'
  showCountdown?: boolean
  size?: 'sm' | 'md'
}

function formatCountdown(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  if (totalMin < 0) {
    const overMin = Math.abs(totalMin)
    if (overMin >= 1440) return `${Math.floor(overMin / 1440)}d ${Math.floor((overMin % 1440) / 60)}h`
    if (overMin >= 60) return `${Math.floor(overMin / 60)}h ${overMin % 60}m`
    return `${overMin}m`
  }
  if (totalMin >= 1440) return `${Math.floor(totalMin / 1440)}d ${Math.floor((totalMin % 1440) / 60)}h`
  if (totalMin >= 60) return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
  return `${totalMin}m`
}

export function SlaBadge({ dueAt, resolvedAt, showCountdown = true, size = 'sm' }: SlaBadgeProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (resolvedAt || !dueAt) return
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [resolvedAt, dueAt])

  if (!dueAt) return null

  const due = new Date(dueAt).getTime()
  const resolved = resolvedAt ? new Date(resolvedAt).getTime() : null
  const pad = size === 'sm' ? '2px 8px' : '4px 10px'
  const fs = size === 'sm' ? '0.72rem' : '0.82rem'

  // Already resolved
  if (resolved) {
    const met = resolved <= due
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: pad,
        borderRadius: 9999, fontSize: fs, fontWeight: 500,
        background: met ? 'var(--success-light, #d1fae5)' : 'var(--danger-light, #fee2e2)',
        color: met ? 'var(--color-sla-ok, #16a34a)' : 'var(--color-sla-breach, #dc2626)',
      }}>
        {met ? <Check size={12} /> : <AlertTriangle size={12} />}
        {met ? 'Splněno' : `Překročeno o ${formatCountdown(resolved - due)}`}
      </span>
    )
  }

  // Not yet resolved — countdown
  const remaining = due - now
  const hoursLeft = remaining / 3_600_000

  let bg: string, color: string, blink = false
  if (hoursLeft > 4) {
    bg = 'var(--success-light, #d1fae5)'
    color = 'var(--color-sla-ok, #16a34a)'
  } else if (hoursLeft > 1) {
    bg = 'var(--warning-light, #fef3c7)'
    color = 'var(--color-sla-warning, #f59e0b)'
  } else if (hoursLeft > 0) {
    bg = 'var(--danger-light, #fee2e2)'
    color = 'var(--color-sla-breach, #dc2626)'
    blink = true
  } else {
    bg = 'var(--danger-light, #fee2e2)'
    color = 'var(--color-sla-breach, #dc2626)'
    blink = true
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: pad,
      borderRadius: 9999, fontSize: fs, fontWeight: remaining < 0 ? 700 : 500,
      background: bg, color,
      animation: blink ? 'sla-blink 1.5s ease-in-out infinite' : undefined,
    }}>
      <Clock size={12} />
      {showCountdown && (
        remaining > 0
          ? formatCountdown(remaining)
          : `Překročeno o ${formatCountdown(Math.abs(remaining))}`
      )}
      <style>{`@keyframes sla-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </span>
  )
}

interface SlaProgressBarProps {
  createdAt: Date | string
  dueAt: Date | string
  resolvedAt?: Date | string | null
  className?: string
}

export function SlaProgressBar({ createdAt, dueAt, resolvedAt, className }: SlaProgressBarProps) {
  const created = new Date(createdAt).getTime()
  const due = new Date(dueAt).getTime()
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now()
  const total = due - created
  if (total <= 0) return null
  const elapsed = end - created
  const pct = Math.min((elapsed / total) * 100, 150) // allow overflow to 150%

  let barColor: string
  if (pct > 100) barColor = 'var(--color-sla-breach, #dc2626)'
  else if (pct > 75) barColor = 'var(--color-sla-warning, #f59e0b)'
  else barColor = 'var(--color-sla-ok, #16a34a)'

  return (
    <div className={className} style={{ height: 4, background: 'var(--gray-200)', borderRadius: 2, overflow: 'visible', position: 'relative' }}>
      <div style={{
        height: '100%', borderRadius: 2,
        width: `${Math.min(pct, 100)}%`,
        background: barColor,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}
