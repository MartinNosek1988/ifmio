import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { CurrencyDisplay } from './CurrencyDisplay'

interface BreakdownItem {
  label: string
  value: number
  detail?: string
}

interface ExplainTooltipProps {
  label: string
  value: number
  breakdown: BreakdownItem[]
  formula?: string
  children: ReactNode
}

export function ExplainTooltip({ label, value, breakdown, formula, children }: ExplainTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') { setOpen(false); return }
      if (e instanceof MouseEvent && ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', handler) }
  }, [open])

  return (
    <div ref={ref} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative' }}>
      {children}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Zobrazit detail výpočtu"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'inline-flex' }}
      >
        <Info size={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
          background: 'var(--color-surface, #fff)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '12px 16px',
          minWidth: 280, maxWidth: 400, fontSize: '0.82rem',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--dark)', marginBottom: 8 }}>
            {label}: <CurrencyDisplay amount={value} colorize={false} size="sm" />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            {breakdown.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  {item.detail && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.detail}</div>}
                </div>
                <CurrencyDisplay amount={item.value} colorize={false} size="sm" />
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Celkem</span>
            <CurrencyDisplay amount={value} colorize={false} size="sm" />
          </div>
          {formula && (
            <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Výpočet: {formula}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
