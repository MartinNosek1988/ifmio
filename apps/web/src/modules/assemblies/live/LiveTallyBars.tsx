interface Props {
  votesFor: number; votesAgainst: number; votesAbstain: number
  totalVoted: number; totalEligible: number
}

export function LiveTallyBars({ votesFor, votesAgainst, votesAbstain, totalVoted, totalEligible }: Props) {
  const total = votesFor + votesAgainst + votesAbstain
  const pctFor = total > 0 ? (votesFor / total) * 100 : 0
  const pctAgainst = total > 0 ? (votesAgainst / total) * 100 : 0
  const pctAbstain = total > 0 ? (votesAbstain / total) * 100 : 0

  const barStyle = (color: string, pct: number): React.CSSProperties => ({
    height: 48, borderRadius: 8, background: color, width: `${pct}%`,
    transition: 'width 0.3s ease', minWidth: pct > 0 ? 60 : 0,
    display: 'flex', alignItems: 'center', paddingLeft: 12,
    color: '#fff', fontWeight: 700, fontSize: '1.2rem',
  })

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 80, fontSize: '1rem', fontWeight: 600, color: '#22c55e' }}>ANO</span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={barStyle('#22c55e', pctFor)}>{pctFor.toFixed(1)} %</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 80, fontSize: '1rem', fontWeight: 600, color: '#ef4444' }}>NE</span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={barStyle('#ef4444', pctAgainst)}>{pctAgainst.toFixed(1)} %</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 80, fontSize: '1rem', fontWeight: 600, color: '#f59e0b' }}>ZDRŽET</span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={barStyle('#f59e0b', pctAbstain)}>{pctAbstain.toFixed(1)} %</div>
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>
        Odhlasovalo: {totalVoted}/{totalEligible} vlastníků
      </div>
    </div>
  )
}
