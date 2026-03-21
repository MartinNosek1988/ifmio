interface PendingKeypad {
  keypadId: string
  attendeeName: string
  share: number
}

interface Props {
  pending: PendingKeypad[]
  totalKeypads: number
  votedKeypads: number
}

export function LivePendingKeypads({ pending, totalKeypads, votedKeypads }: Props) {
  if (pending.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', color: '#22c55e' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>✓ Všichni odhlasovali</div>
        <div style={{ fontSize: '.9rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
          {votedKeypads}/{totalKeypads} ovladačů
        </div>
      </div>
    )
  }

  const visible = pending.slice(0, 10)
  const remaining = pending.length - visible.length

  return (
    <div>
      <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.7)' }}>
        Čekáme na hlasování ({pending.length}):
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visible.map(p => (
          <div key={p.keypadId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{ fontSize: '.95rem' }}>
              <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600, marginRight: 10 }}>
                #{p.keypadId}
              </span>
              {p.attendeeName}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.85rem', fontFamily: 'monospace' }}>
              {(p.share * 100).toFixed(3)} %
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.85rem', padding: '4px 12px' }}>
            … a dalších {remaining}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
