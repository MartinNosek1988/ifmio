import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal, Button } from './index'
import { CurrencyDisplay } from './CurrencyDisplay'

interface Impact {
  icon?: ReactNode
  label: string
  value: string | number
  isCurrency?: boolean
  highlight?: 'info' | 'warning' | 'danger'
}

interface WhatIfPreviewProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isConfirming?: boolean
  title: string
  description?: string
  impacts: Impact[]
  warnings?: string[]
  confirmLabel?: string
  cancelLabel?: string
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  info: 'var(--info)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

export function WhatIfPreview({
  open,
  onClose,
  onConfirm,
  isConfirming = false,
  title,
  description,
  impacts,
  warnings,
  confirmLabel = 'Potvrdit a vytvořit',
  cancelLabel = 'Zrušit',
}: WhatIfPreviewProps) {
  if (!open) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>{cancelLabel}</Button>
          <Button variant="primary" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? 'Zpracovávám...' : confirmLabel}
          </Button>
        </div>
      }
    >
      {description && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
          {description}
        </p>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--dark)', marginBottom: 8 }}>
          Co se stane:
        </div>
        <div style={{
          background: 'var(--gray-50)', borderRadius: 8, padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {impacts.map((impact, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {impact.icon}
                {impact.label}
              </span>
              <span style={{
                fontWeight: 600,
                color: impact.highlight ? HIGHLIGHT_COLORS[impact.highlight] : 'var(--dark)',
              }}>
                {impact.isCurrency && typeof impact.value === 'number'
                  ? <CurrencyDisplay amount={impact.value} colorize={false} size="sm" />
                  : impact.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {warnings && warnings.length > 0 && (
        <div style={{
          background: 'var(--warning-light, #fef3c7)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 8, padding: '10px 14px',
        }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400e', fontSize: '0.82rem', marginBottom: i < warnings.length - 1 ? 4 : 0 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              {w}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
