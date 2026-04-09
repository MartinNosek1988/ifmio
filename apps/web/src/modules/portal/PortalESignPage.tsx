import { useMyESignRequests } from './api/portal.queries'
import { Badge, LoadingSpinner } from '../../shared/components'
import { FileSignature, Clock } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  pending: { label: 'Čeká na podpis', variant: 'yellow' },
  viewed: { label: 'Zobrazeno', variant: 'blue' },
  signed: { label: 'Podepsáno', variant: 'green' },
  declined: { label: 'Odmítnuto', variant: 'red' },
  cancelled: { label: 'Zrušeno', variant: 'muted' },
}

export default function PortalESignPage() {
  const { data: requests = [], isLoading } = useMyESignRequests()

  if (isLoading) return <LoadingSpinner />

  const pending = requests.filter((r: any) => r.signatoryStatus === 'pending' || r.signatoryStatus === 'viewed')
  const completed = requests.filter((r: any) => r.signatoryStatus === 'signed' || r.signatoryStatus === 'declined')

  return (
    <div data-testid="portal-esign-page">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24 }}>Elektronické podpisy</h1>

      {pending.length === 0 && completed.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <FileSignature size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>Žádné žádosti o podpis</div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Čekající na podpis</h2>
          {pending.map((r: any) => {
            const daysLeft = Math.max(0, Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / 86_400_000))
            const cfg = STATUS_CONFIG[r.signatoryStatus] ?? STATUS_CONFIG.pending
            return (
              <div key={r.signatoryId} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                padding: 16, marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{r.documentTitle}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                    <Badge variant={daysLeft <= 3 ? 'red' : 'muted'}>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      {daysLeft} dní
                    </Badge>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Typ: {r.documentType === 'management_contract' ? 'Smlouva o správě' : r.documentType === 'tenancy' ? 'Nájemní smlouva' : r.documentType === 'protocol' ? 'Protokol' : 'Dokument'}
                  {' · '}
                  Platnost do {new Date(r.expiresAt).toLocaleDateString('cs-CZ')}
                </div>
                {r.accessToken && (
                  <a
                    href={`/sign/${r.accessToken}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', background: 'var(--primary, #6366f1)', color: '#fff',
                      borderRadius: 6, fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none',
                    }}
                  >
                    <FileSignature size={15} /> Podepsat
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Archiv</h2>
          {completed.map((r: any) => {
            const cfg = STATUS_CONFIG[r.signatoryStatus] ?? STATUS_CONFIG.pending
            return (
              <div key={r.signatoryId} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                padding: 14, marginBottom: 8, opacity: 0.7,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{r.documentTitle}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                    {r.signedAt && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(r.signedAt).toLocaleDateString('cs-CZ')}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
