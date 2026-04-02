import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface FormSectionProps {
  title: string
  subtitle?: string
  defaultExpanded?: boolean
  children: ReactNode
  badge?: ReactNode
  collapsible?: boolean
}

export function FormSection({
  title,
  subtitle,
  defaultExpanded = true,
  children,
  badge,
  collapsible = true,
}: FormSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isOpen = !collapsible || expanded

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => collapsible && setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 0',
          background: 'none',
          border: 'none',
          cursor: collapsible ? 'pointer' : 'default',
          textAlign: 'left',
        }}
      >
        {collapsible && (
          <ChevronDown
            size={16}
            style={{
              color: 'var(--gray-400)',
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--dark)',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {badge}
      </button>
      <div
        style={{
          overflow: 'hidden',
          transition: 'max-height 0.25s ease, opacity 0.2s ease',
          maxHeight: isOpen ? 2000 : 0,
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div style={{ paddingTop: 4, paddingBottom: 8 }}>{children}</div>
      </div>
    </div>
  )
}

interface FormHeaderProps {
  title: string
  subtitle?: string
}

export function FormHeader({ title, subtitle }: FormHeaderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--dark)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            margin: '4px 0 0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

interface FormFooterProps {
  onCancel: () => void
  onSubmit: () => void
  isSubmitting?: boolean
  isValid?: boolean
  submitLabel?: string
  cancelLabel?: string
  showDraft?: boolean
  onSaveDraft?: () => void
}

export function FormFooter({
  onCancel,
  onSubmit,
  isSubmitting = false,
  isValid = true,
  submitLabel = 'Uložit',
  cancelLabel = 'Zrušit',
  showDraft = false,
  onSaveDraft,
}: FormFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'flex-end',
        paddingTop: 12,
        borderTop: '1px solid var(--border)',
        marginTop: 8,
      }}
    >
      <button type="button" className="btn" onClick={onCancel}>
        {cancelLabel}
      </button>
      {showDraft && onSaveDraft && (
        <button type="button" className="btn" onClick={onSaveDraft} disabled={isSubmitting}>
          Uložit jako koncept
        </button>
      )}
      <button
        type="button"
        className="btn btn--primary"
        onClick={onSubmit}
        disabled={isSubmitting || !isValid}
        title={!isValid ? 'Opravte chyby ve formuláři' : undefined}
      >
        {isSubmitting ? 'Ukládám...' : submitLabel}
      </button>
    </div>
  )
}
