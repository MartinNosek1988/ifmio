import { useEffect, useRef } from 'react'

interface ShortcutGroup {
  label: string
  shortcuts: Array<{ keys: string[]; description: string }>
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Navigace',
    shortcuts: [
      { keys: ['g', 'd'], description: 'Dashboard' },
      { keys: ['g', 'p'], description: 'Nemovitosti' },
      { keys: ['g', 'f'], description: 'Finance' },
      { keys: ['g', 'h'], description: 'Helpdesk' },
      { keys: ['g', 'w'], description: 'Pracovní úkoly' },
      { keys: ['g', 'r'], description: 'Osoby' },
      { keys: ['g', 'x'], description: 'Reports' },
      { keys: ['g', 'a'], description: 'Audit log' },
    ],
  },
  {
    label: 'Akce',
    shortcuts: [
      { keys: ['?'], description: 'Tato nápověda' },
      { keys: ['Esc'], description: 'Zavřít / zpět' },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsOverlay({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-overlay-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface, #fff)', borderRadius: 12,
          padding: 24, width: 'min(420px, calc(100vw - 32px))',
          maxHeight: '80vh', overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', outline: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 id="shortcuts-overlay-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Klávesové zkratky</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }} aria-label="Zavřít">×</button>
        </div>
        {SHORTCUT_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{group.label}</div>
            {group.shortcuts.map(s => (
              <div key={s.description} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--dark)' }}>{s.description}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {s.keys.map(k => (
                    <kbd key={k} style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                      border: '1px solid var(--border)', background: 'var(--gray-50, #f9fafb)',
                      fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 500,
                      color: 'var(--dark)', minWidth: 24, textAlign: 'center',
                    }}>{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
          Zkratky fungují mimo textová pole
        </div>
      </div>
    </div>
  )
}
