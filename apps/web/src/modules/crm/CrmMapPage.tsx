import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../../core/api/client'
import { Map as MapIcon } from 'lucide-react'

// ── Leaflet icon fix (Vite) ─────────────────────────

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── Colored marker icons ────────────────────────────

function createIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  })
}

const ICONS = {
  green: createIcon('#16a34a'),
  orange: createIcon('#d97706'),
  red: createIcon('#dc2626'),
  blue: createIcon('#2563eb'),
}

function getIcon(quality: number, hasOrg: boolean): L.DivIcon {
  if (hasOrg) return ICONS.blue
  if (quality >= 70) return ICONS.green
  if (quality >= 30) return ICONS.orange
  return ICONS.red
}

// ── Types ───────────────────────────────────────────

interface MapPoint {
  id: string
  lat: number
  lng: number
  street?: string
  houseNumber?: string
  district?: string
  quality: number
  hasOrg: boolean
}

interface TerritoryOption {
  id: string
  code: string
  name: string
  level: string
  lat?: number
  lng?: number
  _count?: { buildings: number; children: number }
}

// ── Constants ───────────────────────────────────────

const CZ_CENTER: [number, number] = [49.82, 15.47]

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border, #d1d5db)',
  fontSize: '0.82rem', background: 'var(--input-bg, #fff)',
}

// ── Component ───────────────────────────────────────

export default function CrmMapPage() {
  const navigate = useNavigate()
  const [krajId, setKrajId] = useState('')
  const [okresId, setOkresId] = useState('')
  const [obecId, setObecId] = useState('')
  const [mcId, setMcId] = useState('')
  const [minQuality, setMinQuality] = useState('')
  const [hasOrg, setHasOrg] = useState('')

  const activeTerritoryId = mcId || obecId || okresId || krajId

  // Territory cascade
  const { data: kraje = [] } = useQuery<TerritoryOption[]>({
    queryKey: ['territories', 'REGION'],
    queryFn: () => apiClient.get('/knowledge-base/territories', { params: { level: 'REGION' } }).then(r => r.data),
  })

  const { data: okresy = [] } = useQuery<TerritoryOption[]>({
    queryKey: ['territories', 'DISTRICT', krajId],
    queryFn: () => apiClient.get('/knowledge-base/territories', { params: { level: 'DISTRICT', parentId: krajId } }).then(r => r.data),
    enabled: !!krajId,
  })

  const { data: obce = [] } = useQuery<TerritoryOption[]>({
    queryKey: ['territories', 'MUNICIPALITY', okresId],
    queryFn: () => apiClient.get('/knowledge-base/territories', { params: { level: 'MUNICIPALITY', parentId: okresId } }).then(r => r.data),
    enabled: !!okresId,
  })

  const selectedObec = obce.find(o => o.id === obecId)
  const obecHasDistricts = (selectedObec as any)?.hasDistricts ?? false

  const { data: mestskeCasti = [] } = useQuery<TerritoryOption[]>({
    queryKey: ['territories', 'CITY_PART', obecId],
    queryFn: () => apiClient.get('/knowledge-base/territories', { params: { level: 'CITY_PART', parentId: obecId } }).then(r => r.data),
    enabled: !!obecId && obecHasDistricts,
  })

  // Map points
  const { data: points = [], isLoading } = useQuery<MapPoint[]>({
    queryKey: ['crm-map-points', activeTerritoryId, minQuality, hasOrg],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (activeTerritoryId) params.territoryId = activeTerritoryId
      if (minQuality) params.minQuality = minQuality
      if (hasOrg) params.hasOrganization = hasOrg
      return apiClient.get('/knowledge-base/buildings/map-points', { params }).then(r => r.data)
    },
  })

  const filtered = useMemo(() =>
    points.filter(p => p.lat && p.lng),
    [points],
  )

  // Auto-center on selected territory
  const selectedTerritory = mcId ? mestskeCasti.find(t => t.id === mcId)
    : obecId ? obce.find(t => t.id === obecId)
    : okresId ? okresy.find(t => t.id === okresId)
    : krajId ? kraje.find(t => t.id === krajId)
    : null
  const mapCenter: [number, number] = selectedTerritory?.lat && selectedTerritory?.lng
    ? [selectedTerritory.lat, selectedTerritory.lng]
    : CZ_CENTER
  const mapZoom = mcId ? 14 : obecId ? 13 : okresId ? 11 : krajId ? 10 : 7

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapIcon size={22} />
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Mapa budov</h1>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {isLoading ? 'Načítám...' : `Zobrazeno: ${filtered.length.toLocaleString('cs-CZ')} budov`}
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <select value={krajId} onChange={e => { setKrajId(e.target.value); setOkresId(''); setObecId(''); setMcId('') }} style={inputStyle}>
            <option value="">Kraj: vše</option>
            {kraje.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          {krajId && (
            <select value={okresId} onChange={e => { setOkresId(e.target.value); setObecId(''); setMcId('') }} style={inputStyle}>
              <option value="">Okres: vše</option>
              {okresy.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          {okresId && (
            <select value={obecId} onChange={e => { setObecId(e.target.value); setMcId('') }} style={inputStyle}>
              <option value="">Obec: vše</option>
              {obce.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          {obecId && obecHasDistricts && (
            <select value={mcId} onChange={e => setMcId(e.target.value)} style={inputStyle}>
              <option value="">MČ: vše</option>
              {mestskeCasti.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <select value={minQuality} onChange={e => setMinQuality(e.target.value)} style={inputStyle}>
            <option value="">Quality: vše</option>
            <option value="70">70+</option>
            <option value="50">50+</option>
            <option value="30">30+</option>
          </select>
          <select value={hasOrg} onChange={e => setHasOrg(e.target.value)} style={inputStyle}>
            <option value="">Organizace: vše</option>
            <option value="true">S organizací</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#2563eb', marginRight: 4, verticalAlign: -1 }} />S organizací</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16a34a', marginRight: 4, verticalAlign: -1 }} />Quality 70+</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#d97706', marginRight: 4, verticalAlign: -1 }} />Quality 30-69</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#dc2626', marginRight: 4, verticalAlign: -1 }} />Quality &lt;30</span>
      </div>

      {/* Map */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border, #e5e7eb)' }}>
        <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} center={mapCenter} zoom={mapZoom} style={{ height: 'calc(100vh - 200px)', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup chunkedLoading>
            {filtered.map(p => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={getIcon(p.quality, p.hasOrg)}>
                <Popup>
                  <div style={{ minWidth: 180, fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {p.street || '—'} {p.houseNumber || ''}
                    </div>
                    {p.district && <div style={{ color: '#6b7280', marginBottom: 4 }}>{p.district}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span>Quality: {p.quality}/100</span>
                      <div style={{ width: 50, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(p.quality, 100)}%`, height: '100%', borderRadius: 3,
                          background: p.quality >= 70 ? '#16a34a' : p.quality >= 30 ? '#d97706' : '#dc2626',
                        }} />
                      </div>
                    </div>
                    {p.hasOrg && <div style={{ color: '#2563eb', fontSize: '0.78rem', marginBottom: 4 }}>S organizací (SVJ/BD)</div>}
                    <button
                      onClick={() => navigate(`/crm/buildings/${p.id}`)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--primary, #0d9488)', background: 'transparent', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      Otevřít detail
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  )
}
