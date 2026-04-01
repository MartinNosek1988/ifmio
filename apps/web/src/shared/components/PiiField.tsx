import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { usePermission } from '../hooks/usePermission'

/* ── PII Badge ─────────────────────────────────────────────── */

interface PiiBadgeProps {
  label?: string
  size?: 'sm' | 'md'
}

export function PiiBadge({ label = 'Osobní údaj', size = 'sm' }: PiiBadgeProps) {
  const sz = size === 'sm' ? 10 : 12
  return (
    <span
      title={`${label} podléhající GDPR`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: size === 'sm' ? '1px 5px' : '2px 7px',
        borderRadius: 9999,
        background: 'var(--color-pii-bg, #fef3c7)',
        color: 'var(--color-pii-badge, #f59e0b)',
        fontSize: sz,
        fontWeight: 500,
        lineHeight: 1,
        verticalAlign: 'middle',
        cursor: 'help',
      }}
    >
      <Lock size={sz} />
      {size === 'md' && label}
    </span>
  )
}

/* ── PII Masking ───────────────────────────────────────────── */

export type PiiType = 'name' | 'email' | 'phone' | 'birthNumber' | 'bankAccount' | 'address'

function maskValue(value: string, type: PiiType): string {
  if (!value) return ''
  switch (type) {
    case 'name':
      return value // jméno se neskrývá
    case 'email': {
      const [local, domain] = value.split('@')
      if (!domain) return '***'
      const prefix = local ? local.slice(0, 3) : ''
      return `${prefix}***@${domain}`
    }
    case 'phone':
      return value.replace(/(\+?\d{1,4}\s?).*/, '$1*** *** ***')
    case 'birthNumber':
      return '******/****'
    case 'bankAccount':
      return '*****/****'
    case 'address': {
      const lines = value.split('\n')
      return lines[0] ? `${lines[0].slice(0, 10)}***` : '***'
    }
    default:
      return '***'
  }
}

/* ── usePiiVisibility ──────────────────────────────────────── */

const ADMIN_ROLES = ['tenant_owner', 'tenant_admin'] as const
const MANAGER_ROLES = ['property_manager'] as const
const FINANCE_ROLES = ['finance_manager'] as const

/** PII visibility matrix per role group */
const PII_VISIBILITY: Record<PiiType, { visible: string[]; masked: string[] }> = {
  name:         { visible: ['*'], masked: [] },
  email:        { visible: [...ADMIN_ROLES, ...MANAGER_ROLES, ...FINANCE_ROLES], masked: ['operations'] },
  phone:        { visible: [...ADMIN_ROLES, ...MANAGER_ROLES, 'operations'], masked: [...FINANCE_ROLES] },
  birthNumber:  { visible: [...ADMIN_ROLES], masked: [...MANAGER_ROLES, ...FINANCE_ROLES, 'operations'] },
  bankAccount:  { visible: [...ADMIN_ROLES, ...MANAGER_ROLES, ...FINANCE_ROLES], masked: ['operations'] },
  address:      { visible: ['*'], masked: [] },
}

export function usePiiVisibility(piiType: PiiType) {
  const { currentRole } = usePermission()
  const [revealed, setRevealed] = useState(false)

  const vis = PII_VISIBILITY[piiType]
  const isAdmin = ADMIN_ROLES.includes(currentRole as (typeof ADMIN_ROLES)[number])
  const alwaysVisible = vis.visible.includes('*') || (currentRole && vis.visible.includes(currentRole))
  const isVisible = alwaysVisible || revealed || isAdmin

  const canReveal = !alwaysVisible && !isAdmin && currentRole !== null
  const reveal = useCallback(() => setRevealed(true), [])
  const hide = useCallback(() => setRevealed(false), [])

  // Auto-hide after 30 seconds
  useEffect(() => {
    if (!revealed) return
    const timer = setTimeout(() => setRevealed(false), 30_000)
    return () => clearTimeout(timer)
  }, [revealed])

  return { isVisible: !!isVisible, canReveal, reveal, hide }
}

/* ── PII Field ─────────────────────────────────────────────── */

interface PiiFieldProps {
  value: string
  type: PiiType
  showBadge?: boolean
  children?: ReactNode
}

export function PiiField({ value, type, showBadge = true, children }: PiiFieldProps) {
  const { isVisible, canReveal, reveal, hide } = usePiiVisibility(type)

  const displayed = isVisible ? value : maskValue(value, type)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {children ?? <span>{displayed}</span>}
      {showBadge && <PiiBadge size="sm" />}
      {canReveal && !isVisible && (
        <button
          type="button"
          onClick={reveal}
          title="Zobrazit osobní údaj"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 2,
            display: 'inline-flex',
          }}
        >
          <Eye size={14} />
        </button>
      )}
      {canReveal && isVisible && (
        <button
          type="button"
          onClick={hide}
          title="Skrýt osobní údaj"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 2,
            display: 'inline-flex',
          }}
        >
          <EyeOff size={14} />
        </button>
      )}
    </span>
  )
}
