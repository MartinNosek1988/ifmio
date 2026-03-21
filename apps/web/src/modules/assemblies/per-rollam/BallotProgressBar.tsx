interface Props {
  submitted: number
  manualEntry: number
  pending: number
  totalShares: number
  respondedShares: number
  deadline: string
}

export function BallotProgressBar({ submitted, manualEntry, pending, totalShares, respondedShares, deadline }: Props) {
  const total = submitted + manualEntry + pending
  const pctSubmitted = total > 0 ? (submitted / total) * 100 : 0
  const pctManual = total > 0 ? (manualEntry / total) * 100 : 0
  const sharePct = totalShares > 0 ? (respondedShares / totalShares) * 100 : 0

  const dl = new Date(deadline)
  const now = new Date()
  const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / 86_400_000)
  const isExpired = daysLeft <= 0
  const isUrgent = daysLeft > 0 && daysLeft <= 3

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '.85rem', flexWrap: 'wrap', gap: 4 }}>
        <span>
          <strong>Odevzdáno: {submitted + manualEntry}/{total}</strong>
          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({sharePct.toFixed(2)} % podílů)</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>• Zbývá: {pending}</span>
        </span>
        <span style={{
          fontWeight: 600, fontSize: '.8rem',
          color: isExpired ? '#ef4444' : isUrgent ? '#f59e0b' : 'var(--text-muted)',
        }}>
          {isExpired ? 'Termín vypršel' : `Termín: ${dl.toLocaleDateString('cs-CZ')}${isUrgent ? ` (${daysLeft} ${daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní'})` : ''}`}
        </span>
      </div>
      <div style={{ height: 12, borderRadius: 6, background: 'var(--border, #e5e7eb)', overflow: 'hidden', display: 'flex' }}>
        <div style={{ height: '100%', background: '#22c55e', width: `${pctSubmitted}%`, transition: 'width 0.4s' }} />
        <div style={{ height: '100%', background: '#6366f1', width: `${pctManual}%`, transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '.75rem', color: 'var(--text-muted)' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginRight: 4 }} />Online</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#6366f1', marginRight: 4 }} />Ručně</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--border)', marginRight: 4 }} />Čeká</span>
      </div>
    </div>
  )
}
