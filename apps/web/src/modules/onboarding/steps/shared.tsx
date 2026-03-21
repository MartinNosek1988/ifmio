import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  icon?: ReactNode
  children: ReactNode
}

export function ActionButton({
  variant = 'primary', icon, children, disabled, ...rest
}: ActionButtonProps) {
  const isPrimary = variant === 'primary' && !disabled

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 8,
        fontWeight: 600, fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: isPrimary ? 'none' : '1px solid var(--border, #e5e7eb)',
        background: isPrimary ? '#6366f1' : disabled ? 'var(--surface-2, #f3f4f6)' : 'var(--surface, #fff)',
        color: isPrimary ? '#fff' : disabled ? 'var(--text-muted, #9ca3af)' : 'var(--text, #374151)',
        opacity: disabled ? 0.6 : 1,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function InfoText({ children }: { children: ReactNode }) {
  return (
    <p style={{
      margin: 0, fontSize: 13,
      color: 'var(--text-muted, #6b7280)',
      lineHeight: 1.5,
    }}>
      {children}
    </p>
  )
}

export function DetailLine({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 600, color: '#22c55e',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {children}
    </div>
  )
}
