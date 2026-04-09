import { useMyVotings } from './api/portal.queries'
import { Badge, LoadingSpinner } from '../../shared/components'
import { Vote, Clock, CheckCircle2 } from 'lucide-react'

export default function PortalVotingPage() {
  const { data: votings = [], isLoading } = useMyVotings()

  if (isLoading) return <LoadingSpinner />

  const pending = votings.filter((v: any) => !v.hasResponded)
  const responded = votings.filter((v: any) => v.hasResponded)

  return (
    <div data-testid="portal-voting-page">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24 }}>Hlasování per rollam</h1>

      {pending.length === 0 && responded.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <Vote size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>Žádné aktivní hlasování</div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Čekající na Vaše hlasování</h2>
          {pending.map((v: any) => {
            const daysLeft = Math.max(0, Math.ceil((new Date(v.deadline).getTime() - Date.now()) / 86_400_000))
            return (
              <div key={v.ballotId} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                padding: 16, marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{v.title}</span>
                  <Badge variant={daysLeft <= 3 ? 'red' : 'yellow'}>
                    <Clock size={12} style={{ marginRight: 4 }} />
                    {daysLeft} {daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní'}
                  </Badge>
                </div>
                {v.description && <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 12 }}>{v.description}</div>}
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  {v.items?.length ?? 0} bodů k hlasování · do {new Date(v.deadline).toLocaleDateString('cs-CZ')}
                </div>
                {v.accessToken && (
                  <a
                    href={`/hlasovani/${v.accessToken}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', background: 'var(--primary, #6366f1)', color: '#fff',
                      borderRadius: 6, fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none',
                    }}
                  >
                    <Vote size={15} /> Hlasovat
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {responded.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Odeslaná hlasování</h2>
          {responded.map((v: any) => (
            <div key={v.ballotId} style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
              padding: 14, marginBottom: 8, opacity: 0.7,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>{v.title}</span>
                <Badge variant="green"><CheckCircle2 size={12} style={{ marginRight: 4 }} /> Odesláno</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
