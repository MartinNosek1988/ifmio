import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../../../i18n/i18n'

export function MioChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'bot' | 'user'; text: string }>>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()
  const c = t.chat

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open && messages.length === 0) setMessages([{ role: 'bot', text: c.greeting }])
  }, [open, messages.length, c.greeting])

  const handleReply = (reply: string) => {
    setMessages(prev => [...prev, { role: 'user', text: reply }])
    const responses = c.responses as Record<string, string>
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: responses[reply] ?? '🤖' }])
    }, 600)
  }

  const handleSend = () => {
    const v = inputRef.current?.value.trim()
    if (v) { handleReply(v); inputRef.current!.value = '' }
  }

  return (
    <>
      <button className="mio-chat-bubble" onClick={() => setOpen(!open)} aria-label={c.ariaOpen} aria-expanded={open}>
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div ref={panelRef} className="mio-chat-panel" role="dialog" aria-label={c.ariaDialog}>
          <div className="mio-chat-panel__header">
            <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>if<span style={{ color: 'var(--teal)' }}>mio</span></span>
            <button onClick={() => setOpen(false)} aria-label={c.ariaClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--gray-400)' }}>✕</button>
          </div>
          <div className="mio-chat-panel__body">
            {messages.map((msg, i) => (
              <div key={i} className={`mio-chat-panel__message mio-chat-panel__message--${msg.role}`}>{msg.text}</div>
            ))}
            {messages.length <= 1 && (
              <div className="mio-chat-panel__chips">
                {c.replies.map(r => <button key={r} className="mio-chat-panel__chip" onClick={() => handleReply(r)}>{r}</button>)}
              </div>
            )}
          </div>
          <div className="mio-chat-panel__footer">
            <div className="mio-chat-panel__input-row">
              <input ref={inputRef} type="text" placeholder={c.placeholder} className="mio-chat-panel__input" onKeyDown={e => { if (e.key === 'Enter') handleSend() }} />
              <button className="mio-chat-panel__send" aria-label={c.ariaSend} onClick={handleSend}>→</button>
            </div>
            <div className="mio-chat-panel__powered">{c.powered}</div>
          </div>
        </div>
      )}
    </>
  )
}
