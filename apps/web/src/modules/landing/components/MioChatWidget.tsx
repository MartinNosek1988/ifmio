import { useState, useEffect, useRef } from 'react'
import { CHAT_WIDGET } from '../../../data/landing-content'

export function MioChatWidget() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Focus trap when open
  useEffect(() => {
    if (open && panelRef.current) {
      const first = panelRef.current.querySelector<HTMLElement>('button, [tabindex]')
      first?.focus()
    }
  }, [open])

  return (
    <>
      <button
        className="mio-chat-bubble"
        onClick={() => setOpen(!open)}
        aria-label="Otevřít chat s Mio AI"
        aria-expanded={open}
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div ref={panelRef} className="mio-chat-panel" role="dialog" aria-label="Mio AI chat">
          <div className="mio-chat-panel__header">
            <span className="mio-chat-panel__avatar">🤖</span>
            <div>
              <strong>Mio</strong>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>AI asistent</div>
            </div>
            <button className="mio-chat-panel__close" onClick={() => setOpen(false)} aria-label="Zavřít chat">✕</button>
          </div>

          <div className="mio-chat-panel__body">
            <div className="mio-chat-panel__message mio-chat-panel__message--bot">
              {CHAT_WIDGET.greeting}
            </div>

            <div className="mio-chat-panel__quick-replies">
              {CHAT_WIDGET.quickReplies.map(reply => (
                <button key={reply} className="mio-chat-panel__chip" onClick={() => { /* placeholder */ }}>
                  {reply}
                </button>
              ))}
            </div>
          </div>

          <div className="mio-chat-panel__footer">
            <a href="#demo" className="mio-chat-panel__escalation" onClick={() => setOpen(false)}>
              {CHAT_WIDGET.escalation}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
