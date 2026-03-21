interface Props {
  presentShares: number
  totalShares: number
  threshold?: number // default 50
}

export function QuorumBar({ presentShares, totalShares, threshold = 50 }: Props) {
  const pct = totalShares > 0 ? (presentShares / totalShares) * 100 : 0
  const isQuorate = pct > threshold
  const fillColor = isQuorate ? '#22c55e' : '#ef4444'

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '.85rem' }}>
        <span style={{ fontWeight: 600 }}>
          Přítomnost: {pct.toFixed(2)} %
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (kvórum: {threshold} %)</span>
        </span>
        <span style={{
          fontWeight: 700, fontSize: '.8rem', padding: '2px 10px', borderRadius: 10,
          background: isQuorate ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
          color: fillColor,
        }}>
          {isQuorate ? 'Usnášeníschopné' : 'Neusnášeníschopné'}
        </span>
      </div>
      <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'var(--border, #e5e7eb)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 6, background: fillColor,
          width: `${Math.min(pct, 100)}%`,
          transition: 'width 0.5s ease',
        }} />
        {/* Threshold marker */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: `${threshold}%`,
          width: 2, background: 'var(--text, #374151)', opacity: 0.5,
        }} />
      </div>
    </div>
  )
}
