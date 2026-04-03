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

// ── Constants ───────────────────────────────────────

const PRAHA_CENTER: [number, number] = [50.08, 14.42]
const PRAHA_DISTRICTS = [
  '', 'Praha 1', 'Praha 2', 'Praha 3', 'Praha 4', 'Praha 5', 'Praha 6', 'Praha 7',
  'Praha 8', 'Praha 9', 'Praha 10', 'Praha 11', 'Praha 12', 'Praha 13', 'Praha 14',
  'Praha 15', 'Praha 16', 'Praha 17', 'Praha 18', 'Praha 19', 'Praha 20', 'Praha 21', 'Praha 22',
]

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border, #d1d5db)',
  fontSize: '0.82rem', background: 'var(--input-bg, #fff)',
}

// ── Component ───────────────────────────────────────

export default function CrmMapPage() {
  const navigate = useNavigate()
  const [district, setDistrict] = useState('')
  const [minQuality, setMinQuality] = useState('')
  const [hasOrg, setHasOrg] = useState('')

  const { data: points = [], isLoading } = useQuery<MapPoint[]>({
    queryKey: ['crm-map-points', district, minQuality, hasOrg],
    queryFn: () => {
      const params: Record<string, string> = { city: 'Praha' }
      if (district) params.district = district
      if (minQuality) params.minQuality = minQuality
      if (hasOrg) params.hasOrganization = hasOrg
      return apiClient.get('/knowledge-base/buildings/map-points', { params }).then(r => r.data)
    },
  })

  const filtered = useMemo(() =>
    points.filter(p => p.lat && p.lng),
    [points],
  )

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
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={district} onChange={e => setDistrict(e.target.value)} style={inputStyle}>
            <option value="">Všechny MČ</option>
            {PRAHA_DISTRICTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
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
        <MapContainer center={PRAHA_CENTER} zoom={12} style={{ height: 'calc(100vh - 200px)', width: '100%' }}>
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
