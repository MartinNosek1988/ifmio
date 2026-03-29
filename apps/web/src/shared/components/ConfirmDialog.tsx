import { useEffect, useRef, createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

// ─── COMPONENT ──────────────────────────────────────────────────

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

const VARIANT_COLORS = {
  danger: { bg: '#fef2f2', icon: '#ef4444', btn: '#ef4444' },
  warning: { bg: '#fffbeb', icon: '#f59e0b', btn: '#f59e0b' },
  info: { bg: '#eff6ff', icon: '#3b82f6', btn: '#3b82f6' },
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Potvrdit', cancelLabel = 'Zrušit',
  variant = 'danger', isLoading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const colors = VARIANT_COLORS[variant]

  useEffect(() => {
    if (isOpen) confirmRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) setTimeout(() => cancelRef.current?.focus(), 50)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-desc"
        style={{ background: 'var(--surface, #fff)', borderRadius: 12, padding: '24px', maxWidth: 420, width: '90%', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} style={{ color: colors.icon }} />
          </div>
          <div>
            <div id="confirm-dialog-title" style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{title}</div>
            <div id="confirm-dialog-desc" style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{message}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button ref={cancelRef} onClick={onClose} disabled={isLoading}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '.88rem' }}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} onClick={onConfirm} disabled={isLoading}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: colors.btn, color: '#fff', cursor: 'pointer', fontSize: '.88rem', fontWeight: 500, opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Zpracovávám...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CONTEXT + HOOK ─────────────────────────────────────────────

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error('useConfirm must be used within ConfirmDialogProvider')
  return fn
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    if (state !== null) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve })
    })
  }, [state])

  const handleClose = () => { state?.resolve(false); setState(null) }
  const handleConfirm = () => { state?.resolve(true); setState(null) }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={!!state}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state?.title ?? ''}
        message={state?.message ?? ''}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        variant={state?.variant}
      />
    </ConfirmContext.Provider>
  )
}
