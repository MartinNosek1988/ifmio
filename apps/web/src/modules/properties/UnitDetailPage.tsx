import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { LoadingState, EmptyState, ErrorState } from '../../shared/components'
import { propertiesApi } from './properties-api'

type Tab = 'general' | 'rooms' | 'quantities' | 'equipment' | 'owners' | 'prescriptions' | 'meters' | 'fees' | 'profile'

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'Obecné' },
  { key: 'rooms', label: 'Plochy' },
  { key: 'quantities', label: 'Veličiny' },
  { key: 'equipment', label: 'Vybavení' },
  { key: 'owners', label: 'Vlastníci' },
  { key: 'prescriptions', label: 'Složky předpisu' },
  { key: 'meters', label: 'Měřidla' },
  { key: 'fees', label: 'Správní odměna' },
  { key: 'profile', label: 'Profil' },
]

const SPACE_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Byt', NON_RESIDENTIAL: 'Nebytový', GARAGE: 'Garáž',
  PARKING: 'Parkovací stání', CELLAR: 'Sklep', LAND: 'Pozemek',
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '.85rem' }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--dark)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function NA() {
  return <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>neuvedeno</span>
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '.95rem', color: 'var(--dark)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

export default function UnitDetailPage() {
  const { id: propertyId, unitId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('general')

  const { data: property } = useQuery({
    queryKey: ['properties', propertyId],
    queryFn: () => propertiesApi.getById(propertyId!),
    enabled: !!propertyId,
  })
  const { data: unit, isLoading, error } = useQuery({
    queryKey: ['properties', propertyId, 'units', unitId],
    queryFn: () => propertiesApi.getUnit(propertyId!, unitId!),
    enabled: !!propertyId && !!unitId,
  })
  const { data: nav } = useQuery({
    queryKey: ['properties', propertyId, 'units', unitId, 'nav'],
    queryFn: () => propertiesApi.getUnitNav(propertyId!, unitId!),
    enabled: !!propertyId && !!unitId,
  })
  const { data: rooms } = useQuery({
    queryKey: ['properties', propertyId, 'units', unitId, 'rooms'],
    queryFn: () => propertiesApi.listRooms(propertyId!, unitId!),
    enabled: !!propertyId && !!unitId && tab === 'rooms',
  })
  const { data: quantities } = useQuery({
    queryKey: ['properties', propertyId, 'units', unitId, 'quantities'],
    queryFn: () => propertiesApi.listQuantities(propertyId!, unitId!),
    enabled: !!propertyId && !!unitId && tab === 'quantities',
  })
  const { data: equipment } = useQuery({
    queryKey: ['properties', propertyId, 'units', unitId, 'equipment'],
    queryFn: () => propertiesApi.listEquipment(propertyId!, unitId!),
    enabled: !!propertyId && !!unitId && tab === 'equipment',
  })
  const { data: fees } = useQuery({
    queryKey: ['properties', propertyId, 'units', unitId, 'fees'],
    queryFn: () => propertiesApi.listFees(propertyId!, unitId!),
    enabled: !!propertyId && !!unitId && tab === 'fees',
  })

  if (isLoading) return <LoadingState />
  if (error || !unit) return (
    <div>
      <button className="btn btn--sm" onClick={() => navigate(`/properties/${propertyId}`)} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Zpět
      </button>
      <ErrorState message="Jednotka nenalezena." />
    </div>
  )

  const spaceLabel = SPACE_LABELS[unit.spaceType ?? ''] ?? unit.spaceType ?? 'Jiný'
  const subtitle = [spaceLabel, unit.floor != null ? `${unit.floor}. NP` : null, unit.area != null ? `${unit.area} m²` : null].filter(Boolean).join(' · ')

  function goUnit(id: string | null | undefined) {
    if (id) navigate(`/properties/${propertyId}/units/${id}`)
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 8, fontSize: '.82rem', color: 'var(--gray-400)' }}>
        <button onClick={() => navigate('/properties')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '.82rem', fontFamily: 'var(--font-body)' }}>
          Nemovitosti
        </button>
        <span style={{ margin: '0 6px' }}>/</span>
        <button onClick={() => navigate(`/properties/${propertyId}`)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '.82rem', fontFamily: 'var(--font-body)' }}>
          {property?.name ?? '...'}
        </button>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: 'var(--gray-600)' }}>{unit.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <button className="btn btn--sm" onClick={() => navigate(`/properties/${propertyId}`)} style={{ padding: '6px 10px' }}>
              <ArrowLeft size={14} />
            </button>
            <h1 style={{ margin: 0 }}>Jednotka {unit.name}</h1>
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: '.9rem', margin: 0, paddingLeft: 44 }}>{subtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Unit navigation */}
          {nav && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
              <button className="btn btn--sm" disabled={!nav.prevId} onClick={() => goUnit(nav.prevId)} style={{ padding: '6px 8px' }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '.82rem', color: 'var(--gray-500)', minWidth: 60, textAlign: 'center' }}>
                {nav.current} z {nav.total}
              </span>
              <button className="btn btn--sm" disabled={!nav.nextId} onClick={() => goUnit(nav.nextId)} style={{ padding: '6px 8px' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
          <button className="btn btn--sm"><Pencil size={14} /> Upravit</button>
          <button className="btn btn--sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-light)' }}><Trash2 size={14} /> Smazat</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ─── Obecné ──────────────────────────────────────────── */}
      {tab === 'general' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Card title={`Jednotka ${unit.name}`}>
            <FieldRow label="Ozn. dle KN" value={unit.knDesignation ?? unit.name} />
            <FieldRow label="Vlastní označení" value={unit.ownDesignation ?? <NA />} />
            <FieldRow label="Dispozice" value={unit.disposition ?? <NA />} />
            <FieldRow label="Podlaží" value={unit.floor != null ? `${unit.floor}. NP` : <NA />} />
            <FieldRow label="Podíl na spol. č.d." value={unit.commonAreaShare != null ? `${(Number(unit.commonAreaShare) * 100).toFixed(4)} %` : <NA />} />
            {unit.occupancies && unit.occupancies.length > 0 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--gray-600)', marginTop: 16, marginBottom: 8 }}>Aktuální vlastník</div>
                {unit.occupancies.filter((o: any) => o.isActive && o.role === 'owner').map((o: any) => (
                  <div key={o.id} style={{ fontSize: '.85rem' }}>
                    {o.resident?.isLegalEntity ? o.resident.companyName : `${o.resident?.firstName} ${o.resident?.lastName}`}
                    {o.ownershipShare != null && <span style={{ color: 'var(--gray-400)', marginLeft: 8 }}>({(o.ownershipShare * 100).toFixed(2)} %)</span>}
                  </div>
                ))}
              </>
            )}
          </Card>
          <Card title="Vlastnosti">
            <FieldRow label="Podlahová plocha" value={unit.area != null ? `${unit.area} m²` : <NA />} />
            <FieldRow label="Vytápěná plocha" value={unit.heatingArea != null ? `${unit.heatingArea} m²` : <NA />} />
            <FieldRow label="Plocha TÚV" value={unit.tuvArea != null ? `${unit.tuvArea} m²` : <NA />} />
            <FieldRow label="Typ prostoru" value={spaceLabel} />
            <FieldRow label="Počet osob" value={unit.personCount != null ? String(unit.personCount) : <NA />} />
            <FieldRow label="Výtah" value={unit.hasElevator != null ? (unit.hasElevator ? 'Ano' : 'Ne') : <NA />} />
            <FieldRow label="Způsob vytápění" value={unit.heatingMethod ?? <NA />} />
            <FieldRow label="Ext. pár. symbol" value={unit.extAllocatorRef ?? <NA />} />
          </Card>
        </div>
      )}

      {/* ─── Plochy (Rooms) ──────────────────────────────────── */}
      {tab === 'rooms' && (
        rooms && rooms.length > 0 ? (
          <div className="card">
            <table className="tbl">
              <thead><tr><th>Místnost</th><th style={{ textAlign: 'right' }}>Plocha (m²)</th><th style={{ textAlign: 'right' }}>Koeficient</th><th style={{ textAlign: 'right' }}>Započ. plocha (m²)</th></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td style={{ textAlign: 'right' }}>{r.area.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{r.coefficient.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{(r.calculatedArea ?? r.area * r.coefficient).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 700 }}>Celkem</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{rooms.reduce((s, r) => s + r.area, 0).toFixed(2)}</td>
                  <td />
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{rooms.reduce((s, r) => s + (r.calculatedArea ?? r.area * r.coefficient), 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <EmptyState title="Zatím žádné místnosti" description="Přidejte místnosti a plochy jednotky." />
      )}

      {/* ─── Veličiny (Quantities) ───────────────────────────── */}
      {tab === 'quantities' && (
        quantities && quantities.length > 0 ? (
          <div className="card">
            <table className="tbl">
              <thead><tr><th>Veličina</th><th style={{ textAlign: 'right' }}>Hodnota</th><th>Jednotka</th></tr></thead>
              <tbody>
                {quantities.map(q => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 500 }}>{q.name}</td>
                    <td style={{ textAlign: 'right' }}>{q.value}</td>
                    <td>{q.unitLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Zatím žádné veličiny" description="Nastavte veličiny pro výpočty a vyúčtování." />
      )}

      {/* ─── Vybavení (Equipment) ────────────────────────────── */}
      {tab === 'equipment' && (
        equipment && equipment.length > 0 ? (
          <div className="card">
            <table className="tbl">
              <thead><tr><th>Vybavení</th><th>Stav</th><th>Poznámka</th></tr></thead>
              <tbody>
                {equipment.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.name}</td>
                    <td>
                      <span className={`badge badge--${e.status === 'functional' ? 'green' : e.status === 'broken' ? 'red' : 'yellow'}`}>
                        {e.status === 'functional' ? 'funkční' : e.status === 'broken' ? 'nefunkční' : 'vyměněno'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-500)' }}>{e.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Zatím žádné vybavení" description="Evidujte vybavení jednotky." />
      )}

      {/* ─── Vlastníci (Owners) ──────────────────────────────── */}
      {tab === 'owners' && (
        unit.occupancies && unit.occupancies.length > 0 ? (
          <div className="card">
            <table className="tbl">
              <thead><tr><th>Vlastník / nájemce</th><th>Role</th><th>Od</th><th>Do</th><th style={{ textAlign: 'right' }}>Podíl</th></tr></thead>
              <tbody>
                {unit.occupancies.map((o: any) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500 }}>{o.resident?.isLegalEntity ? o.resident.companyName : `${o.resident?.firstName} ${o.resident?.lastName}`}</td>
                    <td><span className={`badge badge--${o.role === 'owner' ? 'blue' : o.role === 'tenant' ? 'green' : 'muted'}`}>{o.role === 'owner' ? 'vlastník' : o.role === 'tenant' ? 'nájemce' : 'člen'}</span></td>
                    <td>{new Date(o.startDate).toLocaleDateString('cs')}</td>
                    <td>{o.endDate ? new Date(o.endDate).toLocaleDateString('cs') : <span style={{ color: 'var(--gray-400)' }}>dosud</span>}</td>
                    <td style={{ textAlign: 'right' }}>{o.ownershipShare != null ? `${(o.ownershipShare * 100).toFixed(2)} %` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Zatím žádní vlastníci" description="Přidejte vlastníka nebo nájemce jednotky." />
      )}

      {/* ─── Složky předpisu ─────────────────────────────────── */}
      {tab === 'prescriptions' && (
        <EmptyState title="Složky předpisu" description="Správa složek předpisu — propojení s modulem Finance." />
      )}

      {/* ─── Měřidla ─────────────────────────────────────────── */}
      {tab === 'meters' && (
        <EmptyState title="Měřidla" description="Měřidla přiřazená k jednotce — propojení s modulem Měřidla & Energie." />
      )}

      {/* ─── Správní odměna (Fees) ───────────────────────────── */}
      {tab === 'fees' && (
        fees && fees.length > 0 ? (
          <div className="card">
            <table className="tbl">
              <thead><tr><th>Typ</th><th style={{ textAlign: 'right' }}>Částka/měs.</th><th>Způsob výpočtu</th><th>Platnost od</th><th>Platnost do</th></tr></thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>Správní odměna</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{f.amount.toLocaleString('cs')} Kč</td>
                    <td>{f.calculationType === 'flat' ? 'paušál' : f.calculationType === 'per_area' ? 'dle plochy' : 'dle osob'}</td>
                    <td>{new Date(f.validFrom).toLocaleDateString('cs')}</td>
                    <td>{f.validTo ? new Date(f.validTo).toLocaleDateString('cs') : <span style={{ color: 'var(--gray-400)' }}>neomezeno</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Zatím žádná správní odměna" description="Nastavte správní odměnu pro jednotku." />
      )}

      {/* ─── Profil ──────────────────────────────────────────── */}
      {tab === 'profile' && (
        <Card title={`Profil jednotky ${unit.name}`}>
          <FieldRow label="Typ" value={spaceLabel} />
          <FieldRow label="Označení" value={unit.name} />
          <FieldRow label="Podlaží" value={unit.floor != null ? `${unit.floor}. NP` : <NA />} />
          <FieldRow label="Celková plocha" value={unit.area != null ? `${unit.area} m²` : <NA />} />
          <FieldRow label="Dispozice" value={unit.disposition ?? <NA />} />
          <FieldRow label="Počet osob" value={unit.personCount != null ? String(unit.personCount) : <NA />} />
          <FieldRow label="Obsazena" value={unit.isOccupied ? 'Ano' : 'Ne'} />
          <FieldRow label="Ext. pár. symbol" value={unit.extAllocatorRef ?? <NA />} />
          <FieldRow label="Vytvořeno" value={new Date(unit.createdAt).toLocaleDateString('cs')} />
          <FieldRow label="Naposledy upraveno" value={new Date(unit.updatedAt).toLocaleDateString('cs')} />
        </Card>
      )}
    </div>
  )
}
