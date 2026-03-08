import { useState } from 'react';
import { Bot, X, Send } from 'lucide-react';

export function MioPanel() {
  const [open, setOpen] = useState(false);

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

          <div style={{ flex: 1, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
            <div style={{ textAlign: 'center' }}>
              <Bot size={40} color="var(--text-muted)" style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 12 }}>
                AI asistent bude k dispozici po pripojeni backendu.
              </p>
            </div>
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Napiste zpravu..."
              disabled
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 6,
                padding: '8px 12px', fontSize: '0.82rem', background: '#F8FAFC',
                color: 'var(--text-muted)',
              }}
            />
            <button className="btn btn--primary btn--sm" disabled style={{ opacity: 0.5 }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
