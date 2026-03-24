import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../../../i18n/i18n'

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export function MioChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [quickRepliesVisible, setQuickRepliesVisible] = useState(true)
  const [sessionId] = useState(() => crypto.randomUUID())
  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const { t, locale } = useI18n()
  const c = t.chat

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  async function sendMessage(text: string) {
    const userMsg = { role: 'user' as const, content: text }
    setMessages(prev => [...prev, userMsg])
    setQuickRepliesVisible(false)
    setIsTyping(true)

    try {
      const res = await fetch(`${API_URL}/mio/public-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
          conversationHistory: messages.slice(-10),
          locale,
        }),
      })

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: locale === 'cs'
          ? 'Omlouvám se, momentálně nejsem dostupný. Kontaktujte nás na info@ifmio.com.'
          : 'Sorry, I\'m currently unavailable. Contact us at info@ifmio.com.',
      }])
    } finally {
      setIsTyping(false)
    }
  }

  function handleQuickReply(text: string) {
    sendMessage(text)
  }

  function handleSend() {
    const text = inputRef.current?.value.trim()
    if (!text) return
    inputRef.current!.value = ''
    sendMessage(text)
  }

  return (
    <>
      <button className="mio-chat-bubble" onClick={() => setOpen(!open)} aria-label={c.ariaOpen} aria-expanded={open}>
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="mio-chat-panel" role="dialog" aria-label={c.ariaDialog}>
          <div className="mio-chat-panel__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mio-chat__avatar">🤖</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', fontFamily: 'var(--font-display)' }}>Mio AI</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>Online</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label={c.ariaClose} className="mio-chat-panel__close">✕</button>
          </div>

          <div className="mio-chat-panel__body" ref={bodyRef}>
            {/* Welcome message */}
            <div className="mio-chat__message mio-chat__message--bot">
              <span className="mio-chat__avatar">🤖</span>
              <div className="mio-chat__bubble">{c.greeting}</div>
            </div>

            {/* Quick replies */}
            {quickRepliesVisible && (
              <div className="mio-chat__quick-replies">
                {c.replies.map((text, i) => (
                  <button key={i} className="mio-chat__quick-btn" onClick={() => handleQuickReply(text)}>
                    {text}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`mio-chat__message mio-chat__message--${msg.role === 'user' ? 'user' : 'bot'}`}>
                {msg.role === 'assistant' && <span className="mio-chat__avatar">🤖</span>}
                <div className={`mio-chat__bubble${msg.role === 'user' ? ' mio-chat__bubble--user' : ''}`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="mio-chat__message mio-chat__message--bot">
                <span className="mio-chat__avatar">🤖</span>
                <div className="mio-chat__bubble mio-chat__typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          <div className="mio-chat-panel__footer">
            <div className="mio-chat-panel__input-row">
              <input
                ref={inputRef}
                type="text"
                className="mio-chat-panel__input"
                placeholder={c.placeholder}
                onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
              />
              <button className="mio-chat-panel__send" onClick={handleSend} aria-label={c.ariaSend}>→</button>
            </div>
            <div className="mio-chat-panel__powered">{c.powered}</div>
          </div>
        </div>
      )}
    </>
  )
}
