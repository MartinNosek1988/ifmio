import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, LoadingState, EmptyState, ErrorState } from '../../shared/components'
import { propertiesApi } from './properties-api'

type Tab = 'general' | 'owners' | 'meters'

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

  if (isLoading) return <LoadingState />
  if (error || !unit) return (
    <div>
      <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(`/properties/${propertyId}`)}>Zpět</Button>
      <ErrorState message="Jednotka nenalezena." />
    </div>
  )

  const neuvedeno = <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>neuvedeno</span>
  const fieldRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: 'Obecné' },
    { key: 'owners', label: 'Vlastníci' },
    { key: 'meters', label: 'Měřidla' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 8, fontSize: '.82rem', color: 'var(--text-muted)' }}>
        <button onClick={() => navigate('/properties')} style={{ background: 'none', border: 'none', color: 'var(--primary, #6366f1)', cursor: 'pointer', padding: 0, fontSize: '.82rem' }}>
          Nemovitosti
        </button>
        <span style={{ margin: '0 6px' }}>/</span>
        <button onClick={() => navigate(`/properties/${propertyId}`)} style={{ background: 'none', border: 'none', color: 'var(--primary, #6366f1)', cursor: 'pointer', padding: 0, fontSize: '.82rem' }}>
          {property?.name ?? `Č.p. ${propertyId}`}
        </button>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{unit.name}</span>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <Button size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate(`/properties/${propertyId}`)}>Zpět</Button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Jednotka {unit.name}</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge variant={unit.spaceType === 'RESIDENTIAL' ? 'blue' : unit.spaceType === 'NON_RESIDENTIAL' ? 'yellow' : 'muted'}>
            {unit.spaceType === 'RESIDENTIAL' ? 'Byt' : unit.spaceType === 'NON_RESIDENTIAL' ? 'Nebytový' : unit.spaceType ?? 'Jiný'}
          </Badge>
          {unit.isOccupied && <Badge variant="green">Obsazena</Badge>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Obecné */}
      {tab === 'general' && (
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Identifikace</div>
            <div style={fieldRow}><span className="text-muted">Ozn. dle KN:</span> <span style={{ fontWeight: 500 }}>{unit.knDesignation ?? unit.name}</span></div>
            <div style={fieldRow}><span className="text-muted">Vlastní označení:</span> {unit.ownDesignation ?? neuvedeno}</div>
            <div style={fieldRow}><span className="text-muted">Typ prostoru:</span> {unit.spaceType ?? neuvedeno}</div>
            <div style={fieldRow}><span className="text-muted">Dispozice:</span> {unit.disposition ?? neuvedeno}</div>
            <div style={fieldRow}><span className="text-muted">Podlaží:</span> {unit.floor != null ? `${unit.floor}. NP` : neuvedeno}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Plochy a podíl</div>
            <div style={fieldRow}><span className="text-muted">Podlahová plocha:</span> {unit.area != null ? `${unit.area} m²` : neuvedeno}</div>
            <div style={fieldRow}><span className="text-muted">Vytápěná plocha:</span> {unit.heatingArea != null ? `${unit.heatingArea} m²` : neuvedeno}</div>
            <div style={fieldRow}><span className="text-muted">Plocha TÚV:</span> {unit.tuvArea != null ? `${unit.tuvArea} m²` : neuvedeno}</div>
            <div style={fieldRow}><span className="text-muted">Podíl na spol. č.:</span> {unit.commonAreaShare != null ? `${(Number(unit.commonAreaShare) * 100).toFixed(4)} %` : neuvedeno}</div>
            <div style={fieldRow}><span className="text-muted">Počet osob:</span> {unit.personCount != null ? String(unit.personCount) : neuvedeno}</div>
          </div>
        </div>
      )}

      {/* Vlastníci */}
      {tab === 'owners' && <EmptyState title="Vlastníci jednotky" description="Přehled vlastníků — v přípravě." />}

      {/* Měřidla */}
      {tab === 'meters' && <EmptyState title="Měřidla" description="Měřidla přiřazená k jednotce — v přípravě." />}
    </div>
  )
}
