import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, LoadingState, EmptyState } from '../../shared/components'
import { usePrincipals } from './api/principals.queries'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  hoa: { label: 'SVJ', color: 'blue' },
  individual_owner: { label: 'Vlastník FO', color: 'green' },
  corporate_owner: { label: 'Vlastník PO', color: 'yellow' },
  tenant_client: { label: 'Klient nájemce', color: 'purple' },
  mixed_client: { label: 'Smíšený', color: 'muted' },
}

export default function PrincipalsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading } = usePrincipals({ search: search || undefined })
  const principals = data?.data ?? []

  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', width: 280 }
  const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Klienti / Vlastníci</h1>
          <p className="text-muted text-sm">{principals.length} klientů</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="Hledat klienta..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
      </div>

      {isLoading ? <LoadingState /> : principals.length === 0 ? (
        <EmptyState title="Žádní klienti" description="Klienti se vytvoří automaticky při založení nemovitosti." />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Název</th>
                <th style={thStyle}>Typ</th>
                <th style={thStyle}>IČ</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Nemovitosti</th>
                <th style={thStyle}>Stav</th>
              </tr>
            </thead>
            <tbody>
              {principals.map(p => {
                const t = TYPE_LABELS[p.type] ?? { label: p.type, color: 'muted' }
                return (
                  <tr key={p.id} onClick={() => navigate(`/principals/${p.id}`)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{p.displayName}</span></td>
                    <td style={tdStyle}><Badge variant={t.color as any}>{t.label}</Badge></td>
                    <td style={tdStyle} className="text-muted">{p.party?.ic ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{p._count?.managementContracts ?? 0}</td>
                    <td style={tdStyle}><Badge variant={p.isActive ? 'green' : 'muted'}>{p.isActive ? 'Aktivní' : 'Neaktivní'}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
