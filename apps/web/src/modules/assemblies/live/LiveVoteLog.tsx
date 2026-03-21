interface VoteEntry {
  attendeeName: string; choice: string; shareWeight: number; timestamp: string
}

interface Props { votes: VoteEntry[] }

const CHOICE_COLORS: Record<string, string> = { ANO: '#22c55e', NE: '#ef4444', ZDRZET: '#f59e0b' }
const CHOICE_TEXT: Record<string, string> = { ANO: 'ANO', NE: 'NE', ZDRZET: 'ZDRŽET' }

export function LiveVoteLog({ votes }: Props) {
  const visible = votes.slice(0, 8)

  return (
    <div>
      <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.7)' }}>
        Poslední hlasy:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visible.map((v, i) => {
          const time = new Date(v.timestamp).toLocaleTimeString('cs-CZ')
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              animation: i === 0 ? 'fadeIn 0.3s ease' : undefined,
            }}>
              <span style={{ fontSize: '.95rem' }}>
                <span style={{ color: CHOICE_COLORS[v.choice] ?? '#fff', marginRight: 8 }}>✓</span>
                {v.attendeeName}
                <span style={{ color: CHOICE_COLORS[v.choice], fontWeight: 600, marginLeft: 8 }}>
                  {CHOICE_TEXT[v.choice] ?? v.choice}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: '.85rem' }}>
                  ({(v.shareWeight * 100).toFixed(3)} %)
                </span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.85rem' }}>{time}</span>
            </div>
          )
        })}
        {visible.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 16 }}>
            Čekám na hlasy...
          </div>
        )}
      </div>
    </div>
  )
}
