import { useState, useEffect } from 'react'

interface Props {
  result: string; votesFor: number; votesAgainst: number; votesAbstain: number
}

export function LiveResultReveal({ result, votesFor, votesAgainst, votesAbstain }: Props) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1500)
    return () => clearTimeout(timer)
  }, [result])

  const total = votesFor + votesAgainst + votesAbstain
  const isApproved = result === 'SCHVALENO'

  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      {!revealed ? (
        <div style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.5)', animation: 'pulse 1s infinite' }}>
          Vyhodnocuji...
        </div>
      ) : (
        <div style={{ animation: 'scaleIn 0.4s ease' }}>
          <div style={{
            display: 'inline-block', padding: '24px 48px', borderRadius: 16,
            background: isApproved ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            border: `3px solid ${isApproved ? '#22c55e' : '#ef4444'}`,
          }}>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: isApproved ? '#22c55e' : '#ef4444' }}>
              {isApproved ? '✓ SCHVÁLENO' : '✗ NESCHVÁLENO'}
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: '1.4rem', color: 'rgba(255,255,255,0.8)' }}>
            Pro: <span style={{ color: '#22c55e', fontWeight: 700 }}>{total > 0 ? ((votesFor / total) * 100).toFixed(1) : 0} %</span>
            {' • '}
            Proti: <span style={{ color: '#ef4444', fontWeight: 700 }}>{total > 0 ? ((votesAgainst / total) * 100).toFixed(1) : 0} %</span>
            {' • '}
            Zdržel: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{total > 0 ? ((votesAbstain / total) * 100).toFixed(1) : 0} %</span>
          </div>
        </div>
      )}
      <style>{`
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
