import { useState } from 'react'
import { Plus, Calculator, CheckCircle } from 'lucide-react'
import { Badge, Button, LoadingState, EmptyState, Modal } from '../../shared/components'
import { useSettlements, useSettlement, useCreateSettlement, useAddSettlementCost, useCalculateSettlement, useApproveSettlement } from './api/settlement.queries'
import { useProperties } from '../properties/use-properties'
// types used implicitly via hooks

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rozpracováno', color: 'muted' },
  calculated: { label: 'Vypočteno', color: 'blue' },
  approved: { label: 'Schváleno', color: 'green' },
  sent: { label: 'Odesláno', color: 'purple' },
  closed: { label: 'Uzavřeno', color: 'muted' },
}

const COST_TYPE_LABELS: Record<string, string> = {
  heating: 'Vytápění',
  hot_water: 'Teplá voda',
  cold_water: 'Studená voda',
  sewage: 'Stočné',
  elevator: 'Výtah',
  cleaning: 'Úklid',
  lighting: 'Osvětlení',
  waste: 'Odvoz odpadu',
  other: 'Ostatní',
}

const DIST_KEY_LABELS: Record<string, string> = {
  heated_area: 'Dle vytápěné plochy',
  floor_area: 'Dle podlahové plochy',
  person_count: 'Dle počtu osob',
  meter_reading: 'Dle měřidel',
  ownership_share: 'Dle podílu',
  equal: 'Rovným dílem',
  custom: 'Vlastní',
}

export default function SettlementPage() {
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data: settlements = [], isLoading } = useSettlements({ year: filterYear || undefined })

  const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)' }

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

  return (
    <div data-testid="settlements-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Roční vyúčtování</h1>
          <p className="text-muted text-sm">{settlements.length} vyúčtování</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>
          Nové vyúčtování
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {years.map(y => (
          <button
            key={y}
            onClick={() => setFilterYear(y)}
            style={{
              padding: '5px 14px', borderRadius: 6, fontSize: '.82rem', fontWeight: 500, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: filterYear === y ? 'var(--primary, #6366f1)' : 'var(--surface)',
              color: filterYear === y ? '#fff' : 'var(--text-muted)',
            }}
          >
            {y}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingState /> : settlements.length === 0 ? (
        <EmptyState title="Žádná vyúčtování" description="Vytvořte první roční vyúčtování pro vaši nemovitost." action={{ label: 'Nové vyúčtování', onClick: () => setShowCreate(true) }} />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Název</th>
                <th style={thStyle}>Nemovitost</th>
                <th style={thStyle}>Období</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Jednotky</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Náklady</th>
                <th style={thStyle}>Stav</th>
                <th style={thStyle}>Výpočet</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => {
                const st = STATUS_LABELS[s.status] ?? { label: s.status, color: 'muted' }
                return (
                  <tr key={s.id} onClick={() => setDetailId(s.id)} style={{ cursor: 'pointer' }}>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{s.name}</span></td>
                    <td style={tdStyle} className="text-muted">{s.property?.name ?? '—'}</td>
                    <td style={tdStyle} className="text-muted text-sm">
                      {new Date(s.periodFrom).toLocaleDateString('cs-CZ')} – {new Date(s.periodTo).toLocaleDateString('cs-CZ')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{s._count?.items ?? 0}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{s._count?.costEntries ?? 0}</td>
                    <td style={tdStyle}><Badge variant={st.color as any}>{st.label}</Badge></td>
                    <td style={tdStyle} className="text-muted text-sm">
                      {s.calculatedAt ? new Date(s.calculatedAt).toLocaleDateString('cs-CZ') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateSettlementModal onClose={() => setShowCreate(false)} />}
      {detailId && <SettlementDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

// ─── Create Settlement Modal ────────────────────────────────────────

function CreateSettlementModal({ onClose }: { onClose: () => void }) {
  const { data: properties = [] } = useProperties()
  const createMutation = useCreateSettlement()
  const [propertyId, setPropertyId] = useState('')
  const [name, setName] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear() - 1))
  const [penb, setPenb] = useState('')
  const [fcId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }

  const handleCreate = () => {
    if (!propertyId || !name) { setError('Vyplňte povinná pole'); return }
    const y = parseInt(year)
    createMutation.mutate({
      propertyId,
      financialContextId: fcId || undefined,
      name,
      periodFrom: `${y}-01-01`,
      periodTo: `${y}-12-31`,
      buildingEnergyClass: penb || undefined,
    }, {
      onSuccess: () => onClose(),
      onError: (e: any) => setError(e?.response?.data?.message ?? 'Chyba'),
    })
  }

  return (
    <Modal open onClose={onClose} title="Nové vyúčtování"
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" onClick={handleCreate} disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Vytvářím...' : 'Vytvořit'}
        </Button>
      </div>}
    >
      {error && <div style={{ color: 'var(--danger)', fontSize: '.85rem', marginBottom: 12 }}>{error}</div>}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Nemovitost *</label>
        <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={inputStyle}>
          <option value="">— Vyberte —</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Název *</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder={`Vyúčtování ${year}`} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Rok</label>
          <input value={year} onChange={e => setYear(e.target.value)} style={inputStyle} type="number" />
        </div>
        <div>
          <label style={labelStyle}>PENB třída</label>
          <select value={penb} onChange={e => setPenb(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}

// ─── Settlement Detail Modal ────────────────────────────────────────

function SettlementDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: settlement, isLoading } = useSettlement(id)
  const calculateMutation = useCalculateSettlement()
  const approveMutation = useApproveSettlement()
  const addCostMutation = useAddSettlementCost()
  const [showAddCost, setShowAddCost] = useState(false)
  const [unitDetailId, setUnitDetailId] = useState<string | null>(null)

  // Add cost form state
  const [costType, setCostType] = useState('heating')
  const [costName, setCostName] = useState('')
  const [costAmount, setCostAmount] = useState('')
  const [costKey, setCostKey] = useState('heated_area')

  if (isLoading || !settlement) return <Modal open onClose={onClose} title="Načítání..."><LoadingState /></Modal>

  const items = settlement.items ?? []
  const costs = settlement.costEntries ?? []
  const st = STATUS_LABELS[settlement.status] ?? { label: settlement.status, color: 'muted' }

  const totalCost = items.reduce((s, i) => s + Number(i.totalCost), 0)
  const totalAdvances = items.reduce((s, i) => s + Number(i.totalAdvances), 0)
  const totalOverpay = items.filter(i => Number(i.balance) > 0).reduce((s, i) => s + Number(i.balance), 0)
  const totalUnderpay = items.filter(i => Number(i.balance) < 0).reduce((s, i) => s + Math.abs(Number(i.balance)), 0)

  const thStyle: React.CSSProperties = { padding: '6px 8px', fontWeight: 600, fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--border)', fontSize: '.82rem' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.83rem', boxSizing: 'border-box' }

  const handleAddCost = () => {
    addCostMutation.mutate({
      id: settlement.id,
      data: { costType, name: costName, totalAmount: parseFloat(costAmount), distributionKey: costKey },
    }, { onSuccess: () => { setShowAddCost(false); setCostName(''); setCostAmount('') } })
  }

  const fmtKc = (v: number) => v.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' Kč'

  return (
    <Modal open onClose={onClose} title={settlement.name} subtitle={`${settlement.property?.name} · ${st.label}`}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zavřít</Button>
        {settlement.status === 'draft' && costs.length > 0 && (
          <Button icon={<Calculator size={14} />} onClick={() => calculateMutation.mutate(id)} disabled={calculateMutation.isPending}>
            {calculateMutation.isPending ? 'Počítám...' : 'Vypočítat'}
          </Button>
        )}
        {settlement.status === 'calculated' && (
          <Button variant="primary" icon={<CheckCircle size={14} />} onClick={() => approveMutation.mutate(id)} disabled={approveMutation.isPending}>
            Schválit
          </Button>
        )}
      </div>}
    >
      {/* Summary KPIs */}
      {settlement.status !== 'draft' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'var(--surface-2, #f3f4f6)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div className="text-muted text-sm">Náklady</div>
            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{fmtKc(totalCost)}</div>
          </div>
          <div style={{ background: 'var(--surface-2, #f3f4f6)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div className="text-muted text-sm">Zálohy</div>
            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{fmtKc(totalAdvances)}</div>
          </div>
          <div style={{ background: 'rgba(34,197,94,.1)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div className="text-muted text-sm">Přeplatky</div>
            <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--accent-green, #22c55e)' }}>{fmtKc(totalOverpay)}</div>
          </div>
          <div style={{ background: 'rgba(239,68,68,.1)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div className="text-muted text-sm">Nedoplatky</div>
            <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--danger, #ef4444)' }}>{fmtKc(totalUnderpay)}</div>
          </div>
        </div>
      )}

      {/* Costs section */}
      <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>
        Nákladové položky ({costs.length})
        {settlement.status === 'draft' && (
          <button onClick={() => setShowAddCost(!showAddCost)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #6366f1)', fontSize: '.8rem' }}>+ Přidat</button>
        )}
      </div>

      {showAddCost && (
        <div style={{ background: 'var(--surface-2, #f3f4f6)', borderRadius: 8, padding: 12, marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <select value={costType} onChange={e => setCostType(e.target.value)} style={inputStyle}>
              {Object.entries(COST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><input value={costName} onChange={e => setCostName(e.target.value)} placeholder="Název položky" style={inputStyle} /></div>
          <div><input value={costAmount} onChange={e => setCostAmount(e.target.value)} placeholder="Částka" type="number" style={inputStyle} /></div>
          <div>
            <select value={costKey} onChange={e => setCostKey(e.target.value)} style={inputStyle}>
              {Object.entries(DIST_KEY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
            <Button size="sm" onClick={handleAddCost} disabled={!costName || !costAmount}>Přidat</Button>
          </div>
        </div>
      )}

      {costs.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thStyle}>Typ</th>
              <th style={thStyle}>Název</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Částka</th>
              <th style={thStyle}>Klíč</th>
            </tr></thead>
            <tbody>
              {costs.map(c => (
                <tr key={c.id}>
                  <td style={tdStyle}><Badge variant="blue">{COST_TYPE_LABELS[c.costType] ?? c.costType}</Badge></td>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmtKc(Number(c.totalAmount))}</td>
                  <td style={tdStyle} className="text-muted text-sm">{DIST_KEY_LABELS[c.distributionKey] ?? c.distributionKey}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Units results */}
      {items.length > 0 && settlement.status !== 'draft' && (
        <>
          <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>Výsledky dle jednotek ({items.length})</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Jednotka</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Vytápění</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>TUV</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Ostatní</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Celkem</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Zálohy</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Výsledek</th>
              </tr></thead>
              <tbody>
                {items.map(i => {
                  const bal = Number(i.balance)
                  return (
                    <tr key={i.id} onClick={() => setUnitDetailId(i.unitId)} style={{ cursor: 'pointer' }}>
                      <td style={tdStyle}><span style={{ fontWeight: 500 }}>{i.unit?.name ?? i.unitId}</span></td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmtKc(Number(i.heatingTotal))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmtKc(Number(i.hotWaterTotal))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmtKc(Number(i.otherCosts))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{fmtKc(Number(i.totalCost))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmtKc(Number(i.totalAdvances))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: bal >= 0 ? 'var(--accent-green, #22c55e)' : 'var(--danger, #ef4444)' }}>
                        {bal >= 0 ? '+' : ''}{fmtKc(bal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Unit detail modal */}
      {unitDetailId && (
        <UnitSettlementDetail settlementId={id} unitId={unitDetailId} onClose={() => setUnitDetailId(null)} />
      )}
    </Modal>
  )
}

// ─── Unit Detail Breakdown ──────────────────────────────────────────

function UnitSettlementDetail({ settlementId, unitId, onClose }: { settlementId: string; unitId: string; onClose: () => void }) {
  const { data: item, isLoading } = useQuery_UnitDetail(settlementId, unitId)

  if (isLoading || !item) return <Modal open onClose={onClose} title="Načítání..."><LoadingState /></Modal>

  const fmtKc = (v: number) => v.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč'
  const bal = Number(item.balance)

  return (
    <Modal open onClose={onClose} title={`Detail: ${item.unit?.name ?? unitId}`}
      subtitle={`Plocha: ${item.heatedArea ?? '—'} m² · Osoby: ${item.personCount ?? '—'}`}
      footer={<Button onClick={onClose}>Zavřít</Button>}
    >
      <div style={{ fontSize: '.85rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'var(--surface-2, #f3f4f6)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Vytápění</div>
          <div>Základní složka: {fmtKc(Number(item.heatingBasic))}</div>
          <div>Spotřební složka: {fmtKc(Number(item.heatingConsumption))}</div>
          {Number(item.heatingCorrected) > 0 && Number(item.heatingCorrected) !== Number(item.heatingTotal) && (
            <div style={{ color: 'var(--accent-orange, #f59e0b)' }}>Po korekci 70–200%: {fmtKc(Number(item.heatingCorrected))}</div>
          )}
          <div style={{ fontWeight: 600, marginTop: 4 }}>Celkem vytápění: {fmtKc(Number(item.heatingTotal))}</div>
        </div>

        <div style={{ background: 'var(--surface-2, #f3f4f6)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Teplá voda</div>
          <div>Základní složka: {fmtKc(Number(item.hotWaterBasic))}</div>
          <div>Spotřební složka: {fmtKc(Number(item.hotWaterConsumption))}</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>Celkem TUV: {fmtKc(Number(item.hotWaterTotal))}</div>
        </div>

        {item.costBreakdown && (item.costBreakdown as any[]).length > 0 && (
          <div style={{ background: 'var(--surface-2, #f3f4f6)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Ostatní služby</div>
            {(item.costBreakdown as any[]).map((cb: any, i: number) => (
              <div key={i}>{COST_TYPE_LABELS[cb.costType] ?? cb.costType}: {fmtKc(cb.amount)} ({DIST_KEY_LABELS[cb.key] ?? cb.key})</div>
            ))}
          </div>
        )}

        <div style={{ background: bal >= 0 ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)', borderRadius: 8, padding: 12 }}>
          <div>Celkové náklady: <strong>{fmtKc(Number(item.totalCost))}</strong></div>
          <div>Zaplacené zálohy: <strong>{fmtKc(Number(item.totalAdvances))}</strong></div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 6, color: bal >= 0 ? 'var(--accent-green, #22c55e)' : 'var(--danger, #ef4444)' }}>
            {bal >= 0 ? 'Přeplatek' : 'Nedoplatek'}: {fmtKc(Math.abs(bal))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// Inline query hook for unit detail
import { useQuery } from '@tanstack/react-query'
import { settlementApi } from './api/settlement.api'

function useQuery_UnitDetail(settlementId: string, unitId: string) {
  return useQuery({
    queryKey: ['settlements', 'unit-detail', settlementId, unitId],
    queryFn: () => settlementApi.getUnitDetail(settlementId, unitId),
    enabled: !!settlementId && !!unitId,
  })
}
