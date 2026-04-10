import { useState } from 'react'
import { useMyUnits, useUnitDetail } from './api/portal.queries'
import { LoadingSpinner } from '../../shared/components'
import { Building2 } from 'lucide-react'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: '.82rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px 16px',
}

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '.82rem',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)',
}

const tdStyle: React.CSSProperties = {
  padding: '4px 8px', borderBottom: '1px solid var(--border)',
}

const emptyStyle: React.CSSProperties = {
  fontSize: '.82rem', color: 'var(--text-muted)', fontStyle: 'italic',
}

export default function MyUnitsPage() {
  const { data: units, isLoading, error } = useMyUnits()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: detailLoading } = useUnitDetail(selectedId)

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
          <div
            key={u.id}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div
              onClick={() => setSelectedId(selectedId === u.id ? null : u.id)}
              style={{ padding: '16px 20px', cursor: 'pointer' }}
            >
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

            {selectedId === u.id && (
              <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)' }}>
                {detailLoading && <LoadingSpinner />}
                {detail && (
                  <>
                    {/* Základní údaje */}
                    <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 8 }}>Základní údaje</div>
                    <div style={gridStyle}>
                      {detail.floor != null && <InfoRow label="Patro" value={String(detail.floor)} />}
                      {detail.area && <InfoRow label="Plocha" value={`${detail.area} m²`} />}
                      {detail.disposition && <InfoRow label="Dispozice" value={detail.disposition} />}
                    </div>

                    {/* Katastr */}
                    {(detail.property?.cadastralArea || detail.property?.landRegistrySheet) && (
                      <>
                        <div style={{ fontWeight: 600, fontSize: '.85rem', margin: '16px 0 8px' }}>Katastr</div>
                        <div style={gridStyle}>
                          {detail.property.cadastralArea && <InfoRow label="Katastrální území" value={detail.property.cadastralArea} />}
                          {detail.property.landRegistrySheet && <InfoRow label="List vlastnictví" value={detail.property.landRegistrySheet} />}
                        </div>
                      </>
                    )}

                    {/* Místnosti */}
                    <div style={{ fontWeight: 600, fontSize: '.85rem', margin: '16px 0 8px' }}>Místnosti ({detail.rooms?.length ?? 0})</div>
                    {detail.rooms?.length > 0 ? (
                      <table style={tableStyle}>
                        <thead><tr><th style={thStyle}>Název</th><th style={thStyle}>Typ</th><th style={{...thStyle, textAlign: 'right'}}>Plocha</th></tr></thead>
                        <tbody>
                          {detail.rooms.map((r: any) => (
                            <tr key={r.id}><td style={tdStyle}>{r.name}</td><td style={tdStyle}>{r.roomType}</td><td style={{...tdStyle, textAlign: 'right'}}>{r.area ? `${r.area} m²` : '\u2014'}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div style={emptyStyle}>Žádné místnosti</div>}

                    {/* Vybavení */}
                    <div style={{ fontWeight: 600, fontSize: '.85rem', margin: '16px 0 8px' }}>Vybavení ({detail.equipment?.length ?? 0})</div>
                    {detail.equipment?.length > 0 ? (
                      <table style={tableStyle}>
                        <thead><tr><th style={thStyle}>Název</th><th style={thStyle}>Stav</th><th style={thStyle}>Ks</th></tr></thead>
                        <tbody>
                          {detail.equipment.map((e: any) => (
                            <tr key={e.id}><td style={tdStyle}>{e.name}</td><td style={tdStyle}>{e.status}</td><td style={tdStyle}>{e.quantity}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div style={emptyStyle}>Žádné vybavení</div>}

                    {/* Evidovaní obyvatelé */}
                    {detail.occupancies?.length > 0 && (
                      <>
                        <div style={{ fontWeight: 600, fontSize: '.85rem', margin: '16px 0 8px' }}>Evidovaní obyvatelé</div>
                        {detail.occupancies.map((o: any) => (
                          <div key={o.id} style={{ fontSize: '.82rem', marginBottom: 4 }}>
                            {o.resident?.firstName} {o.resident?.lastName}
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({o.role})</span>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
