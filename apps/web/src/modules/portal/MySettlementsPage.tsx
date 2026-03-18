import { useMySettlements } from './api/portal.queries'
import { LoadingSpinner } from '../../shared/components'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Koncept', color: 'var(--text-muted)' },
  calculated: { label: 'Vypočteno', color: 'var(--accent-blue, #3b82f6)' },
  approved: { label: 'Schváleno', color: 'var(--success, #22c55e)' },
  sent: { label: 'Odesláno', color: '#8b5cf6' },
  closed: { label: 'Uzavřeno', color: 'var(--text-muted)' },
}

export default function MySettlementsPage() {
  const { data: items, isLoading, error } = useMySettlements()

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-danger">Nepodařilo se načíst vyúčtování.</div>

  if (!items?.length) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Žádná vyúčtování</div>
  }

  // Group by settlement
  const grouped: Record<string, { settlement: any; items: any[] }> = {}
  for (const item of items) {
    const sid = item.settlement.id
    if (!grouped[sid]) grouped[sid] = { settlement: item.settlement, items: [] }
    grouped[sid].items.push(item)
  }

  return (
    <div>
      {Object.values(grouped).map(({ settlement, items }) => {
        const st = STATUS_LABELS[settlement.status] ?? { label: settlement.status, color: 'var(--text-muted)' }
        return (
          <div key={settlement.id} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <h3 style={{ fontSize: '.95rem', fontWeight: 600, margin: 0 }}>{settlement.name}</h3>
              <span style={{ fontSize: '.72rem', fontWeight: 600, borderRadius: 4, padding: '2px 8px', background: `${st.color}15`, color: st.color }}>
                {st.label}
              </span>
            </div>
            <div className="text-muted" style={{ fontSize: '.8rem', marginBottom: 10 }}>
              {settlement.periodFrom?.slice(0, 10)} — {settlement.periodTo?.slice(0, 10)}
            </div>
            {items.map((item: any) => {
              const balance = Number(item.balance)
              return (
                <div key={item.id ?? `${settlement.id}-${item.unitId}`} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.unit?.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '.85rem' }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: '.75rem' }}>Zálohy</div>
                      <div>{Number(item.totalAdvances).toLocaleString('cs-CZ')} Kč</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: '.75rem' }}>Náklady</div>
                      <div>{Number(item.totalCost).toLocaleString('cs-CZ')} Kč</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: '.75rem' }}>Výsledek</div>
                      <div style={{ fontWeight: 700, color: balance >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
                        {balance >= 0 ? `Přeplatek ${balance.toLocaleString('cs-CZ')} Kč` : `Nedoplatek ${Math.abs(balance).toLocaleString('cs-CZ')} Kč`}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
