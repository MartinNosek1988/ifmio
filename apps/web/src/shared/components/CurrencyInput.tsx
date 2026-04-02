import { useState, useCallback, useRef, type ChangeEvent, type FocusEvent } from 'react'
import { formatCurrencyValue, parseCurrency } from '../utils/currency'

interface CurrencyInputProps {
  value: number | null
  onChange: (value: number | null) => void
  currency?: string
  min?: number
  max?: number
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  placeholder?: string
  name?: string
  'data-testid'?: string
}

/**
 * Input for financial amounts with Czech formatting.
 *
 * - Comma as decimal separator
 * - Space as thousands separator (on blur)
 * - Right-aligned, mono font
 * - "Kč" suffix
 * - Select-all on focus
 */
export function CurrencyInput({
  value,
  onChange,
  currency = 'Kč',
  min,
  max,
  disabled = false,
  error,
  label,
  required,
  placeholder = '0,00',
  name,
  ...rest
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    value != null ? formatCurrencyValue(value) : '',
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      // Allow typing: digits, comma, dot, minus, space
      const filtered = raw.replace(/[^0-9,.\-\s]/g, '')
      setDisplayValue(filtered)

      const parsed = parseCurrency(filtered)
      if (parsed !== null) {
        const clamped =
          min != null && parsed < min ? min : max != null && parsed > max ? max : parsed
        onChange(clamped)
      } else if (filtered === '' || filtered === '-') {
        onChange(null)
      }
    },
    [onChange, min, max],
  )

  const handleBlur = useCallback(
    (_e: FocusEvent<HTMLInputElement>) => {
      // Format on blur
      if (value != null) {
        setDisplayValue(formatCurrencyValue(value))
      } else {
        setDisplayValue('')
      }
    },
    [value],
  )

  const handleFocus = useCallback(() => {
    // Select all text on focus for easy replacement
    setTimeout(() => inputRef.current?.select(), 0)
  }, [])

  const borderColor = error ? 'var(--danger)' : 'var(--border)'

  return (
    <div>
      {label && (
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '0.82rem',
            color: 'var(--gray-700)',
            marginBottom: 4,
          }}
        >
          {label}
          {required === false && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
              (nepovinné)
            </span>
          )}
        </label>
      )}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          name={name}
          data-testid={rest['data-testid']}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px 0 0 6px',
            border: `1px solid ${borderColor}`,
            borderRight: 'none',
            background: disabled ? 'var(--gray-50)' : 'var(--color-surface, #fff)',
            color: 'var(--dark)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.9rem',
            textAlign: 'right',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            borderRadius: '0 6px 6px 0',
            border: `1px solid ${borderColor}`,
            borderLeft: 'none',
            background: 'var(--gray-50)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.82rem',
            userSelect: 'none',
          }}
        >
          {currency}
        </span>
      </div>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: 2 }}>{error}</div>
      )}
    </div>
  )
}
