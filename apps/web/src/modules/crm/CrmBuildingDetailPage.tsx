import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../../core/api/client'
import { ArrowLeft, MapPin, Building2, FileText, Clock, Wrench, RefreshCw, BarChart3 } from 'lucide-react'

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

type Tab = 'overview' | 'units' | 'documents' | 'history' | 'condition' | 'completeness'

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
    mutationFn: () => apiClient.post(`/knowledge-base/buildings/${id}/re-enrich`).then(r => r.data),
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
              {org?.orgType && <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: org.orgType === 'SVJ' ? '#ccfbf1' : org.orgType === 'BD' ? '#dbeafe' : '#f3f4f6', color: org.orgType === 'SVJ' ? '#0d9488' : org.orgType === 'BD' ? '#1d4ed8' : '#6b7280', marginRight: 8 }}>{org.orgType}</span>}
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
          { key: 'completeness' as Tab, label: 'Kompletnost', icon: <BarChart3 size={14} /> },
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
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
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
                <a href={building.lat && building.lng
                  ? `https://maps.google.com/maps?q=${building.lat},${building.lng}&z=18`
                  : `https://maps.google.com/maps?q=${encodeURIComponent(`${building.street} ${building.houseNumber}, ${building.city}`)}`
                } target="_blank" rel="noopener noreferrer" style={linkBtn}>Otevřít mapu</a>
                <a href={building.lat && building.lng
                  ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${building.lat},${building.lng}`
                  : `https://maps.google.com/maps?q=${encodeURIComponent(`${building.street} ${building.houseNumber}, ${building.city}`)}&layer=c`
                } target="_blank" rel="noopener noreferrer" style={linkBtn}>Street View</a>
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

          {/* ČÚZK Katastr */}
          {enrichment?.cuzk && (
            <div style={card}>
              <SectionTitle>Katastr nemovitostí (ČÚZK)</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px', fontSize: '0.82rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Typ:</span> {enrichment.cuzk.typStavby}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Využití:</span> {enrichment.cuzk.zpusobVyuziti}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Č.p.:</span> {enrichment.cuzk.cislaDomovni?.join(', ')}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>LV:</span> {enrichment.cuzk.lv?.cislo}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>KÚ:</span> {enrichment.cuzk.lv?.katastralniUzemi}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Část obce:</span> {enrichment.cuzk.castObce}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Parcely:</span> {enrichment.cuzk.parcely?.map((p: any) => p.kmenoveCislo + (p.poddeleni ? '/' + p.poddeleni : '')).join(', ') || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Jednotek:</span> {enrichment.cuzk.jednotekCount}</div>
                {enrichment.cuzk.parcelaDetail && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Výměra:</span> {enrichment.cuzk.parcelaDetail.vymera} m²</div>
                )}
                {enrichment.cuzk.zpusobyOchrany?.length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Ochrana:</span> {enrichment.cuzk.zpusobyOchrany.join(', ')}</div>
                )}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>Zdroj: ČÚZK API KN · {new Date(enrichment.cuzk.fetchedAt).toLocaleDateString('cs-CZ')}</div>
            </div>
          )}

          {/* Stub: Vlastnická struktura */}
          <div style={{ ...card, opacity: 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle>Vlastnická struktura</SectionTitle>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>Připravujeme</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Vlastníci, podíly, zástavní práva, exekuce — vyžaduje ČÚZK Dálkový přístup (~2 Kč/dotaz)</div>
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
            {(enrichment?.sources as any[])?.length > 0 ? (
              <div style={{ fontSize: '0.78rem' }}>
                {(enrichment?.sources as any[] ?? []).map((s: any, i: number) => {
                  const icon = s.status === 'ok' ? '✅' : s.status === 'error' ? '❌' : '⚠️'
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-light, #f3f4f6)' }}>
                      <span style={{ fontWeight: 500 }}>{icon} {s.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{s.fetchedAt ? new Date(s.fetchedAt).toLocaleDateString('cs-CZ') : '—'}</span>
                    </div>
                  )
                })}
              </div>
            ) : building.sources?.length > 0 ? (
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
                  <th style={{ padding: '6px 8px' }}>Využití</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Plocha m²</th>
                  <th style={{ padding: '6px 8px' }}>Podíl na SČ</th>
                  <th style={{ padding: '6px 8px' }}>LV</th>
                </tr>
              </thead>
              <tbody>
                {building.units.map((u: any) => (
                  <tr
                    key={u.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/crm/buildings/${id}/units/${u.id}`)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/crm/buildings/${id}/units/${u.id}`) } }}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-light, #f3f4f6)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted, #f9fafb)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '6px 8px', fontWeight: 500 }}>
                      <Link to={`/crm/buildings/${id}/units/${u.id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                        {u.unitNumber || '—'}
                      </Link>
                    </td>
                    <td style={{ padding: '6px 8px' }}>{u.unitType || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{u.usage || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{u.area || '—'}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{u.shareNumerator && u.shareDenominator ? `${u.shareNumerator}/${u.shareDenominator}` : '—'}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{u.lvNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Žádné jednotky v KB</div>
              <button onClick={() => reEnrichMut.mutate()} disabled={reEnrichMut.isPending}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--primary, #0d9488)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                {reEnrichMut.isPending ? 'Enrichuji...' : 'Re-enrichovat (načte i z katastru)'}
              </button>
            </div>
          )}
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

      {/* Tab: Kompletnost */}
      {tab === 'completeness' && id && <CompletenessTab buildingId={id} />}
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

// ── Completeness tab ───────────────────────────────

interface CField { key: string; label: string; present: boolean; value?: string | number | null; source: string }
interface CCategory { key: string; label: string; status: 'complete' | 'partial' | 'missing'; score: number; fields: CField[] }
interface CData { buildingId: string; overallScore: number; categories: CCategory[]; missingCount: number; totalCount: number }

function CompletenessTab({ buildingId }: { buildingId: string }) {
  const { data, isLoading, isError, refetch } = useQuery<CData>({
    queryKey: ['kb', 'building', buildingId, 'completeness'],
    queryFn: () => apiClient.get(`/knowledge-base/buildings/${buildingId}/completeness`).then(r => r.data),
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Načítám...</div>
  if (isError) return (
    <div style={{ padding: 24, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ fontWeight: 600 }}>Nepodařilo se načíst data o kompletnosti.</div>
      <button type="button" onClick={() => refetch()} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>Zkusit znovu</button>
    </div>
  )
  if (!data) return null

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '20px 0', marginBottom: 20 }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: data.overallScore > 70 ? '#22c55e' : data.overallScore > 40 ? '#eab308' : '#ef4444' }}>
          {data.overallScore}%
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {data.totalCount - data.missingCount} / {data.totalCount} polí vyplněno
        </div>
      </div>
      {data.categories.map((cat) => (
        <CategoryCard key={cat.key} category={cat} />
      ))}
    </div>
  )
}

function CategoryCard({ category }: { category: CCategory }) {
  const [expanded, setExpanded] = useState(false)
  const color = category.status === 'complete' ? '#22c55e' : category.status === 'partial' ? '#eab308' : '#ef4444'
  const present = category.fields.filter((f) => f.present).length
  const total = category.fields.length

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{category.label}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({present}/{total})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ width: `${total > 0 ? (present / total) * 100 : 0}%`, height: '100%', background: color, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{category.score} b.</span>
        </div>
      </button>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px' }}>
          {category.fields.map((f: CField) => (
            <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: f.present ? '#22c55e' : '#ef4444' }}>{f.present ? '\u2713' : '\u2717'}</span>
                <span>{f.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)' }}>
                {f.value != null && <span>{String(f.value).slice(0, 30)}</span>}
                <span style={{ fontSize: '0.72rem' }}>{f.source}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
