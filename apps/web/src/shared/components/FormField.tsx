import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { PiiBadge } from './PiiField'

interface FormFieldProps {
  label: string
  name: string
  error?: string | null
  required?: boolean
  helpText?: string
  pii?: boolean
  computed?: boolean
  computedSource?: string
  children: ReactNode
  className?: string
}

/**
 * Wrapper for form inputs providing consistent label, error, and help text display.
 *
 * @example
 * <FormField label="IČO" name="ico" error={errors.ico} pii>
 *   <input type="text" ... />
 * </FormField>
 */
export function FormField({
  label,
  name,
  error,
  required = true,
  helpText,
  pii,
  computed,
  computedSource,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={className} style={{ marginBottom: 12 }}>
      {/* Label row */}
      <label
        htmlFor={name}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: '0.82rem',
          color: 'var(--gray-700)',
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        {!required && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.75rem' }}>
            (nepovinné)
          </span>
        )}
        {pii && <PiiBadge size="sm" />}
        {computed && (
          <span
            title={computedSource ? `Automaticky vypočteno z: ${computedSource}` : 'Automaticky vypočteno'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              cursor: 'help',
            }}
          >
            <RefreshCw size={10} />
          </span>
        )}
      </label>

      {/* Input */}
      {children}

      {/* Error or help text */}
      {error && (
        <div
          role="alert"
          style={{
            color: 'var(--danger)',
            fontSize: '0.78rem',
            marginTop: 3,
          }}
        >
          {error}
        </div>
      )}
      {!error && helpText && (
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            marginTop: 3,
          }}
        >
          {helpText}
        </div>
      )}
      {!error && computed && computedSource && !helpText && (
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.72rem',
            marginTop: 2,
          }}
        >
          Automaticky vypočteno z {computedSource}
        </div>
      )}
    </div>
  )
}
