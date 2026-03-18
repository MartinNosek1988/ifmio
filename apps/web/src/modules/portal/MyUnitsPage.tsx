import { useMyUnits } from './api/portal.queries'
import { LoadingSpinner } from '../../shared/components'
import { Building2 } from 'lucide-react'

export default function MyUnitsPage() {
  const { data: units, isLoading, error } = useMyUnits()

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-danger">Nepodařilo se načíst jednotky.</div>

  if (!units?.length) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
        <Building2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontWeight: 600, fontSize: '.95rem' }}>Nemáte přiřazené žádné jednotky</p>
        <p style={{ fontSize: '.85rem' }}>Kontaktujte správce nemovitosti.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: 12 }}>
        {units.map((u: any) => (
          <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{u.name}</span>
              <span style={{
                fontSize: '.72rem', fontWeight: 600, borderRadius: 4, padding: '2px 8px',
                background: u.relation === 'owner' ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.12)',
                color: u.relation === 'owner' ? '#6366f1' : '#22c55e',
              }}>
                {u.relation === 'owner' ? 'Vlastník' : 'Nájemník'}
              </span>
            </div>
            {u.property && (
              <div className="text-muted" style={{ fontSize: '.85rem', marginBottom: 6 }}>
                {u.property.name} — {u.property.address}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, fontSize: '.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {u.floor != null && <span>Patro: {u.floor}</span>}
              {u.area != null && <span>Plocha: {u.area} m²</span>}
              {u.disposition && <span>Dispozice: {u.disposition}</span>}
              {u.sharePercent != null && <span>Podíl: {Number(u.sharePercent).toFixed(2)} %</span>}
              {u.rentAmount != null && <span>Nájem: {Number(u.rentAmount).toLocaleString('cs-CZ')} Kč</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
