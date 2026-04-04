import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../../core/api/client'
import { ArrowLeft, MapPin, Building2, FileText, Clock, Wrench, RefreshCw } from 'lucide-react'

// ── Leaflet icon fix (Vite) ─────────────────────────

delete (L.Icon.Default.prototype as any)._getIconUrl

const buildingIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;background:#0d9488;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
})

// ── Types ───────────────────────────────────────────

type Tab = 'overview' | 'units' | 'documents' | 'history' | 'condition'

// ── Styles ──────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--card-bg, #fff)', borderRadius: 12,
  border: '1px solid var(--border, #e5e7eb)', padding: 20,
}

// ── Component ───────────────────────────────────────

export default function CrmBuildingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: building, isLoading } = useQuery({
    queryKey: ['crm-building', id],
    queryFn: () => apiClient.get(`/knowledge-base/buildings/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const qc = useQueryClient()
  const reEnrichMut = useMutation({
    mutationFn: () => apiClient.post('/knowledge-base/enrich', {
      city: building?.city, street: building?.street, postalCode: building?.postalCode,
      lat: building?.lat, lng: building?.lng, ruianCode: building?.ruianBuildingId,
    }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-building', id] }),
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Načítám...</div>
  if (!building) return <div style={{ padding: 40, textAlign: 'center' }}>Budova nenalezena</div>

  const enrichment = building.enrichmentData as Record<string, any> | null
  const org = building.managingOrg
  const quality = building.dataQualityScore || 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('/crm/buildings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <ArrowLeft size={14} /> Zpět na seznam
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              {building.street || building.fullAddress?.split(',')[0]} {building.houseNumber || ''}, {building.city}
            </h1>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {org?.orgType && <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', marginRight: 8 }}>{org.orgType}</span>}
              {building.district && <span>{building.district} &middot; </span>}
              {building.cadastralTerritoryName && <span>KÚ: {building.cadastralTerritoryName} &middot; </span>}
              {building.ruianBuildingId && <span>RÚIAN: {building.ruianBuildingId}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QualityBadge score={quality} />
            <button onClick={() => reEnrichMut.mutate()} disabled={reEnrichMut.isPending}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={13} className={reEnrichMut.isPending ? 'animate-spin' : ''} /> Re-enrichovat
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
        {([
          { key: 'overview' as Tab, label: 'Přehled', icon: <Building2 size={14} /> },
          { key: 'units' as Tab, label: `Jednotky (${building.units?.length || 0})`, icon: <MapPin size={14} /> },
          { key: 'documents' as Tab, label: 'Sbírka listin', icon: <FileText size={14} /> },
          { key: 'history' as Tab, label: 'Historie OR', icon: <Clock size={14} /> },
          { key: 'condition' as Tab, label: 'Stav budovy', icon: <Wrench size={14} /> },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: tab === t.key ? 600 : 400,
            background: 'none', borderBottom: tab === t.key ? '2px solid var(--primary, #0d9488)' : '2px solid transparent',
            color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: -2,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Přehled */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Lokalita */}
          <div style={card}>
            <SectionTitle>Lokalita</SectionTitle>
            {building.lat && building.lng && (
              <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <MapContainer
                  center={[building.lat, building.lng]}
                  zoom={18}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                  dragging={false}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/tile/{z}/{y}/{x}"
                    attribution="&copy; ČÚZK"
                    maxZoom={20}
                  />
                  <Marker position={[building.lat, building.lng]} icon={buildingIcon}>
                    <Popup>{building.fullAddress || building.street || 'Budova'}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
            <InfoGrid items={[
              { label: 'GPS', value: building.lat && building.lng ? `${building.lat.toFixed(4)}°N, ${building.lng.toFixed(4)}°E` : '—' },
              { label: 'KÚ', value: building.cadastralTerritoryName ? `${building.cadastralTerritoryName} (${building.cadastralTerritoryCode || ''})` : '—' },
              { label: 'PSČ', value: building.postalCode || '—' },
              { label: 'Parcela', value: building.parcelNumbers?.join(', ') || '—' },
            ]} />
            {building.lat && building.lng && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <a href={`https://mapy.cz/zakladni?x=${building.lng}&y=${building.lat}&z=18`} target="_blank" rel="noopener noreferrer" style={linkBtn}>Otevřít mapu</a>
                <a href={`https://mapy.cz/panorama?x=${building.lng}&y=${building.lat}&z=18`} target="_blank" rel="noopener noreferrer" style={linkBtn}>Street View</a>
              </div>
            )}
          </div>

          {/* Organizace */}
          <div style={card}>
            <SectionTitle>Organizace {org?.orgType ? `(${org.orgType})` : ''}</SectionTitle>
            {org ? (
              <>
                <InfoGrid items={[
                  { label: 'Název', value: org.name },
                  { label: 'IČO', value: org.ico },
                  { label: 'DIČ', value: org.dic || '—' },
                  { label: 'Vznik', value: org.dateEstablished ? new Date(org.dateEstablished).toLocaleDateString('cs-CZ') : '—' },
                  { label: 'Datová schránka', value: org.dataBoxId || '—' },
                ]} />
                {org.statutoryBodies?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Statutární orgán:</div>
                    {org.statutoryBodies.map((s: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {s.role}: {s.firstName} {s.lastName}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Bez přiřazené organizace</div>
            )}
          </div>

          {/* POI */}
          <div style={card}>
            <SectionTitle>Okolí (500m)</SectionTitle>
            {enrichment?.poi ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.82rem' }}>
                {enrichment.poi.schools > 0 && <span>🏫 {enrichment.poi.schools} škol</span>}
                {(enrichment.poi.busStops + enrichment.poi.tramStops + enrichment.poi.metroStations) > 0 && <span>🚌 {enrichment.poi.busStops + enrichment.poi.tramStops + enrichment.poi.metroStations} MHD</span>}
                {enrichment.poi.doctors > 0 && <span>🏥 {enrichment.poi.doctors} lékařů</span>}
                {enrichment.poi.supermarkets > 0 && <span>🛒 {enrichment.poi.supermarkets} marketů</span>}
                {enrichment.poi.playgrounds > 0 && <span>🌳 {enrichment.poi.playgrounds} hřišť</span>}
                {enrichment.poi.restaurants > 0 && <span>🍴 {enrichment.poi.restaurants} restaurací</span>}
              </div>
            ) : <NoData />}
          </div>

          {/* Rizikový profil */}
          <div style={card}>
            <SectionTitle>Rizikový profil</SectionTitle>
            {enrichment?.risks ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem' }}>
                <span>🌊 Záplavy: <RiskBadge
                  source={enrichment.risks.flood?.source}
                  available={!enrichment.risks.flood?.source?.includes('N/A')}
                  positive={enrichment.risks.flood?.inFloodZone === false}
                  positiveLabel="Mimo zónu"
                  negativeLabel="V záplavovém území"
                /></span>
                <span>☢️ Radon: {(() => {
                  const radonIndex = enrichment.risks.radon?.index
                  const radonLabel = ({ low: 'Nízký', medium: 'Střední', high: 'Vysoký' } as Record<string, string>)[radonIndex || ''] ?? 'Neznámý'
                  const radonAvailable = !enrichment.risks.radon?.source?.includes('N/A') && radonIndex != null
                  return <RiskBadge
                    source={enrichment.risks.radon?.source}
                    available={radonAvailable}
                    positive={radonIndex === 'low'}
                    positiveLabel={radonLabel}
                    negativeLabel={radonLabel}
                  />
                })()}</span>
                {enrichment.risks.heritage && <span>🏛️ Památky: {enrichment.risks.heritage.isProtected ? `⚠️ ${enrichment.risks.heritage.protectionType?.join(', ')}` : '✅ Bez ochrany'}</span>}
                {enrichment.risks.insolvency && <span>⚖️ Insolvence: {enrichment.risks.insolvency.hasInsolvency ? '⚠️ Nalezena' : '✅ Bez'}</span>}
              </div>
            ) : <NoData />}
          </div>

          {/* Cenový odhad */}
          <div style={card}>
            <SectionTitle>Cenový odhad</SectionTitle>
            {enrichment?.priceEstimate?.landPricePerSqm ? (
              <div style={{ fontSize: '0.82rem' }}>
                <div>Pozemek: {enrichment.priceEstimate.landPricePerSqm.toLocaleString('cs-CZ')} Kč/m²</div>
                {enrichment.priceEstimate.estimatedPricePerSqm && <div>Odhad bytu: ~{enrichment.priceEstimate.estimatedPricePerSqm.toLocaleString('cs-CZ')} Kč/m² (±30%)</div>}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{enrichment.priceEstimate.disclaimer || 'Zdroj: IPR Praha'}</div>
              </div>
            ) : <NoData label="Cenový odhad nedostupný" />}
          </div>

          {/* Zdroje dat */}
          <div style={card}>
            <SectionTitle>Zdroje dat</SectionTitle>
            {building.sources?.length > 0 ? (
              <div style={{ fontSize: '0.78rem' }}>
                {building.sources.map((s: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-light, #f3f4f6)' }}>
                    <span style={{ fontWeight: 500 }}>{s.source}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(s.fetchedAt).toLocaleDateString('cs-CZ')}</span>
                  </div>
                ))}
              </div>
            ) : <NoData label="Žádné zdroje" />}
          </div>
        </div>
      )}

      {/* Tab: Jednotky */}
      {tab === 'units' && (
        <div style={card}>
          {building.units?.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Číslo</th>
                  <th style={{ padding: '6px 8px' }}>Typ</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Plocha m²</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Pokojů</th>
                  <th style={{ padding: '6px 8px' }}>Dispozice</th>
                  <th style={{ padding: '6px 8px' }}>Podíl</th>
                </tr>
              </thead>
              <tbody>
                {building.units.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 500 }}>{u.unitNumber || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{u.unitType || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{u.area || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{u.roomCount || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{u.roomLayout || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{u.shareNumerator && u.shareDenominator ? `${u.shareNumerator}/${u.shareDenominator}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <NoData label="Žádné jednotky v KB" />}
        </div>
      )}

      {/* Tab: Sbírka listin */}
      {tab === 'documents' && (
        <div style={card}>
          {org?.sbirkaListiny?.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Název</th>
                  <th style={{ padding: '6px 8px' }}>Typ</th>
                  <th style={{ padding: '6px 8px' }}>Období</th>
                  <th style={{ padding: '6px 8px' }}>Datum podání</th>
                  <th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {org.sbirkaListiny.map((d: any) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)' }}>
                    <td style={{ padding: '6px 8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.documentName}</td>
                    <td style={{ padding: '6px 8px' }}><DocTypeBadge type={d.documentType} /></td>
                    <td style={{ padding: '6px 8px' }}>{d.periodFrom && d.periodTo ? `${new Date(d.periodFrom).getFullYear()}-${new Date(d.periodTo).getFullYear()}` : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{d.filingDate ? new Date(d.filingDate).toLocaleDateString('cs-CZ') : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{d.downloadUrl && <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>PDF</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <NoData label="Žádné dokumenty ve sbírce listin" />}
        </div>
      )}

      {/* Tab: Historie OR */}
      {tab === 'history' && (
        <div style={card}>
          {org?.registryChanges?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {org.registryChanges.map((c: any, i: number) => (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--border-light, #f9fafb)', borderRadius: 8, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: c.changeType === 'zápis' ? 'var(--success)' : c.changeType === 'výmaz' ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {c.changeType}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {c.changeDate ? new Date(c.changeDate).toLocaleDateString('cs-CZ') : '—'}
                    </span>
                  </div>
                  {c.description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{c.description}</div>}
                </div>
              ))}
            </div>
          ) : <NoData label="Žádné záznamy v obchodním rejstříku" />}
        </div>
      )}

      {/* Tab: Stav budovy */}
      {tab === 'condition' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={card}>
            <SectionTitle>Predikce stavu komponent</SectionTitle>
            {enrichment?.conditionPrediction?.components?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {enrichment!.conditionPrediction.components.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-light, #f3f4f6)', fontSize: '0.82rem' }}>
                    <span>{c.name}</span>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                      background: c.risk === 'critical' ? '#fee2e2' : c.risk === 'attention' ? '#fef3c7' : '#dcfce7',
                      color: c.risk === 'critical' ? '#dc2626' : c.risk === 'attention' ? '#d97706' : '#16a34a',
                    }}>
                      {c.risk === 'critical' ? `Po životnosti (${Math.abs(c.remainingLife)} let)` : c.risk === 'attention' ? `Zbývá ${c.remainingLife} let` : `OK (~${c.remainingLife} let)`}
                    </span>
                  </div>
                ))}
              </div>
            ) : <NoData label="Nedostatečná data pro predikci" />}
          </div>

          <div style={card}>
            <SectionTitle>Checklist revizí</SectionTitle>
            {enrichment?.checklist?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {enrichment!.checklist.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0', borderBottom: '1px solid var(--border-light, #f3f4f6)' }}>
                    <span>{c.required ? '🔴' : '🟡'} {c.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c.period}</span>
                  </div>
                ))}
              </div>
            ) : <NoData label="Žádný checklist" />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared sub-components ───────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{children}</div>
}

function NoData({ label = 'Data nedostupná' }: { label?: string }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '8px 0' }}>{label}</div>
}

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '0.82rem' }}>
      {items.map(i => (
        <div key={i.label}><span style={{ color: 'var(--text-muted)' }}>{i.label}:</span> {i.value}</div>
      ))}
    </div>
  )
}

function QualityBadge({ score }: { score: number }) {
  const color = score >= 60 ? '#16a34a' : score >= 30 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 50, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{score}/100</span>
    </div>
  )
}

function DocTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    ucetni_zaverka: 'Účetní závěrka',
    stanovy: 'Stanovy',
    zakladatelska_listina: 'Zakl. listina',
    notarsky_zapis: 'Notářský zápis',
    vyrocni_zprava: 'Výroční zpráva',
    prohlaseni_vlastniku: 'Prohlášení vl.',
    other: 'Jiný',
  }
  return <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, background: 'var(--border-light, #f3f4f6)' }}>{labels[type] || type}</span>
}

function RiskBadge({ source, available, positive, positiveLabel, negativeLabel }: {
  source?: string; available: boolean; positive: boolean; positiveLabel: string; negativeLabel: string
}) {
  if (!available) {
    return <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: '#fef3c7', color: '#92400e' }}
      title={source || 'Služba nedostupná'}>Služba nedostupná</span>
  }
  if (positive) {
    return <span style={{ color: '#16a34a' }}>✅ {positiveLabel}</span>
  }
  return <span style={{ color: '#dc2626' }}>⚠️ {negativeLabel}</span>
}

const linkBtn: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none',
  padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
}
