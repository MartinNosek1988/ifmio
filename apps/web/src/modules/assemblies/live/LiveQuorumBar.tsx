interface Props {
  presentShares: number; totalShares: number
}

export function LiveQuorumBar({ presentShares, totalShares }: Props) {
  const pct = totalShares > 0 ? (presentShares / totalShares) * 100 : 0
  const isQuorate = pct > 50
  const fill = isQuorate ? '#22c55e' : '#ef4444'

  return (
    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
          Přítomnost: {pct.toFixed(2)} %
        </span>
        <span style={{
          fontWeight: 700, fontSize: '.9rem', padding: '4px 14px', borderRadius: 10,
          background: isQuorate ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)',
          color: fill,
        }}>
          {isQuorate ? '✓ USNÁŠENÍSCHOPNÉ' : '✗ NEUSNÁŠENÍSCHOPNÉ'}
        </span>
      </div>
      <div style={{ position: 'relative', height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 8, background: fill, width: `${Math.min(pct, 100)}%`, transition: 'width 0.5s ease' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: 'rgba(255,255,255,0.4)' }} />
      </div>
    </div>
  )
}
