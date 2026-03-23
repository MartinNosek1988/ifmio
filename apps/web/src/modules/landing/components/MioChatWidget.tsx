import { useState, useEffect, useRef } from 'react'
import { CHAT_WIDGET } from '../../../data/landing-content'

const RESPONSES: Record<string, string> = {
  'Chci demo': 'Skvěle! Přejděte na formulář níže nebo nám napište na info@ifmio.com a domluvíme 15minutovou ukázku.',
  'Kolik to stojí?': 'ifmio nabízí tarif Start (zdarma do 50 jednotek), Professional (15 Kč/jednotka/měsíc) a Enterprise (individuálně).',
  'Jaké moduly máte?': 'Evidence, finance, předpisy, konto, revize, helpdesk, komunikace, dokumenty, vyúčtování, portál vlastníků, mobilní appka a samozřejmě já — Mio AI. 🤖',
  'Mluvit s člověkem': 'Samozřejmě! Napište nám na info@ifmio.com nebo zavolejte. Rádi vám vše ukážeme.',
}

export function MioChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'bot' | 'user'; text: string }>>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'bot', text: CHAT_WIDGET.greeting }])
    }
  }, [open, messages.length])

  const handleQuickReply = (reply: string) => {
    setMessages(prev => [...prev, { role: 'user', text: reply }])
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: RESPONSES[reply] ?? 'Díky za dotaz! Zkuste se nás zeptat na něco konkrétnějšího.' }])
    }, 600)
  }

  const handleSend = () => {
    const val = inputRef.current?.value.trim()
    if (val) {
      handleQuickReply(val)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <button className="mio-chat-bubble" onClick={() => setOpen(!open)} aria-label="Otevřít chat s Mio AI" aria-expanded={open}>
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div ref={panelRef} className="mio-chat-panel" role="dialog" aria-label="Mio AI chat">
          <div className="mio-chat-panel__header">
            <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
              if<span style={{ color: 'var(--teal)' }}>mio</span>
            </span>
            <button onClick={() => setOpen(false)} aria-label="Zavřít" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--gray-400)' }}>✕</button>
          </div>

          <div className="mio-chat-panel__body">
            {messages.map((msg, i) => (
              <div key={i} className={`mio-chat-panel__message mio-chat-panel__message--${msg.role}`}>
                {msg.text}
              </div>
            ))}

            {messages.length <= 1 && (
              <div className="mio-chat-panel__chips">
                {CHAT_WIDGET.quickReplies.map(reply => (
                  <button key={reply} className="mio-chat-panel__chip" onClick={() => handleQuickReply(reply)}>
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mio-chat-panel__footer">
            <div className="mio-chat-panel__input">
              <input
                ref={inputRef}
                type="text"
                placeholder="Napište zprávu..."
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSend()
                }}
              />
              <button className="mio-chat-panel__send" aria-label="Odeslat" onClick={handleSend}>→</button>
            </div>
            <div className="mio-chat-panel__powered">{CHAT_WIDGET.powered}</div>
          </div>
        </div>
      )}
    </>
  )
}
