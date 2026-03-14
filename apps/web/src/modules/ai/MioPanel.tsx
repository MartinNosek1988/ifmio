import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send } from 'lucide-react';
import { apiClient } from '../../core/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function MioPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const { data } = await apiClient.post<{ response: string }>('/mio/chat', {
        messages: updated,
      });
      setMessages([...updated, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Omlouvám se, došlo k chybě. Zkuste to znovu.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="mio-fab" onClick={() => setOpen(!open)} title="Mio AI asistent">
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>

      {open && (
        <div className="mio-panel">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={20} color="var(--primary)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mio</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AI asistent pro FM</div>
            </div>
          </div>

          <div ref={scrollRef} style={{
            flex: 1, padding: 16, overflowY: 'auto', minHeight: 260,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <Bot size={36} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 12 }}>
                  Zeptejte se mě na cokoli ohledně správy nemovitostí.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '8px 12px', borderRadius: 10,
                background: msg.role === 'user' ? 'var(--primary, #6366f1)' : 'var(--surface-2, var(--surface))',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              }}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 10,
                background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)',
                fontSize: '0.82rem', color: 'var(--text-muted)',
              }}>
                Mio přemýšlí...
              </div>
            )}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Napište zprávu..."
              disabled={loading}
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 6,
                padding: '8px 12px', fontSize: '0.82rem',
                background: 'var(--surface)', color: 'var(--text)',
              }}
            />
            <button
              className="btn btn--primary btn--sm"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{ opacity: loading || !input.trim() ? 0.5 : 1 }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
