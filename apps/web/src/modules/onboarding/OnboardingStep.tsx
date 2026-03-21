import { type ReactNode, useState } from 'react'
import { Check, ChevronDown, ChevronRight, SkipForward } from 'lucide-react'

interface Props {
  stepNumber: number
  stepKey: string
  title: string
  subtitle?: string
  done: boolean
  skipped: boolean
  blocked: boolean
  blockedBy?: string
  optional?: boolean
  children: ReactNode
  onSkip?: () => void
}

export function OnboardingStep({
  stepNumber, stepKey, title, subtitle, done, skipped, blocked, blockedBy,
  optional, children, onSkip,
}: Props) {
  const [expanded, setExpanded] = useState(!done && !skipped && !blocked)
  const isDone = done || skipped

  const statusBadge = done
    ? { label: 'Hotovo ✓', bg: '#dcfce7', color: '#166534' }
    : skipped
      ? { label: 'Přeskočeno', bg: '#fef9c3', color: '#854d0e' }
      : blocked
        ? { label: 'Čeká', bg: 'var(--surface-2, #f3f4f6)', color: 'var(--text-muted, #9ca3af)' }
        : null

  return (
    <div
      data-testid={`onboarding-step-${stepKey}`}
      style={{
        border: `1px solid ${done ? 'var(--accent-green, #22c55e)' : skipped ? '#facc15' : 'var(--border, #e5e7eb)'}`,
        borderRadius: 12,
        background: blocked ? 'var(--surface-2, #f9fafb)' : 'var(--surface, #fff)',
        opacity: blocked ? 0.55 : 1,
        transition: 'all 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => !blocked && setExpanded(v => !v)}
        disabled={blocked}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px',
          background: 'none', border: 'none', cursor: blocked ? 'default' : 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Step circle */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: done ? '#22c55e' : skipped ? '#facc15' : blocked ? 'var(--border, #e5e7eb)' : '#6366f1',
          color: skipped ? '#854d0e' : '#fff',
          fontWeight: 700, fontSize: 14,
        }}>
          {done ? <Check size={18} /> : skipped ? <SkipForward size={16} /> : stepNumber}
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontWeight: 600, fontSize: 15,
              color: isDone ? 'var(--text-muted, #6b7280)' : 'var(--text, #111)',
              textDecoration: done ? 'line-through' : 'none',
            }}>
              {title}
            </span>
            {optional && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: 'var(--text-muted, #9ca3af)',
                background: 'var(--surface-2, #f3f4f6)',
                padding: '1px 8px', borderRadius: 10,
              }}>
                volitelné
              </span>
            )}
          </div>
          {subtitle && (
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{subtitle}</span>
          )}
        </div>

        {/* Status badge */}
        {statusBadge && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 10, flexShrink: 0,
            background: statusBadge.bg, color: statusBadge.color,
          }}>
            {statusBadge.label}
          </span>
        )}

        {/* Expand chevron */}
        {!blocked && (
          <div style={{ color: 'var(--text-muted, #9ca3af)', flexShrink: 0 }}>
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        )}
      </button>

      {/* Expanded content */}
      {expanded && !blocked && (
        <div style={{
          padding: '0 20px 16px 70px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {children}

          {optional && !isDone && onSkip && (
            <button
              onClick={onSkip}
              style={{
                alignSelf: 'flex-start',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted, #9ca3af)', fontSize: 13, fontWeight: 500,
                padding: 0, textDecoration: 'underline',
              }}
            >
              Doplním později
            </button>
          )}
        </div>
      )}

      {/* Blocked message */}
      {blocked && blockedBy && (
        <div style={{ padding: '0 20px 14px 70px', fontSize: 13, color: 'var(--text-muted, #9ca3af)' }}>
          Nejdříve dokončete krok „{blockedBy}"
        </div>
      )}
    </div>
  )
}
