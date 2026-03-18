import { useState } from 'react'
import { useMyPrescriptions } from './api/portal.queries'
import { LoadingSpinner } from '../../shared/components'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function MyPrescriptionsPage() {
  const { data: prescriptions, isLoading, error } = useMyPrescriptions()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-danger">Nepodařilo se načíst předpisy.</div>

  if (!prescriptions?.length) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Žádné aktivní předpisy</div>
  }

  // Group by unitId
  const grouped: Record<string, { unitName: string; items: any[] }> = {}
  for (const p of prescriptions) {
    const uid = p.unitId ?? 'none'
    if (!grouped[uid]) grouped[uid] = { unitName: p.unit?.name ?? 'Bez jednotky', items: [] }
    grouped[uid].items.push(p)
  }

  return (
    <div>
      {Object.entries(grouped).map(([uid, group]) => (
        <div key={uid} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '.95rem', fontWeight: 600, marginBottom: 10 }}>{group.unitName}</h3>
          {group.items.map((p: any) => (
            <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{Number(p.amount).toLocaleString('cs-CZ')} Kč</div>
                  <div className="text-muted" style={{ fontSize: '.8rem' }}>{p.description}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                  <div>Splatnost: {p.dueDay}. v měsíci</div>
                  {p.variableSymbol && <div>VS: {p.variableSymbol}</div>}
                </div>
              </div>
              <div className="text-muted" style={{ fontSize: '.78rem', marginTop: 4 }}>
                Od: {p.validFrom?.slice(0, 10)} {p.validTo ? `do: ${p.validTo.slice(0, 10)}` : '(bez omezení)'}
              </div>
              {p.items?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #6366f1)', fontSize: '.78rem', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Položky ({p.items.length}) {expanded[p.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {expanded[p.id] && (
                    <table style={{ width: '100%', fontSize: '.8rem', marginTop: 6, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '4px 0', color: 'var(--text-muted)' }}>Název</th>
                          <th style={{ textAlign: 'right', padding: '4px 0', color: 'var(--text-muted)' }}>Částka</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((item: any) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '4px 0' }}>{item.name}</td>
                            <td style={{ textAlign: 'right', padding: '4px 0' }}>{Number(item.amount).toLocaleString('cs-CZ')} Kč</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
