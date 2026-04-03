import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../core/api/client'
import { Building2, Search, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Types ───────────────────────────────────────────

interface BuildingRow {
  id: string
  street?: string
  houseNumber?: string
  fullAddress?: string
  city: string
  district?: string
  postalCode?: string
  buildingType?: string
  numberOfUnits?: number
  dataQualityScore?: number
  lastEnrichedAt?: string
  managingOrg?: { ico: string; name: string; orgType?: string } | null
  _count?: { units: number; properties: number }
}

interface BuildingsResponse {
  data: BuildingRow[]
  total: number
  limit: number
  offset: number
}

// ── Constants ───────────────────────────────────────

const PRAHA_DISTRICTS = [
  '', 'Praha 1', 'Praha 2', 'Praha 3', 'Praha 4', 'Praha 5', 'Praha 6', 'Praha 7',
  'Praha 8', 'Praha 9', 'Praha 10', 'Praha 11', 'Praha 12', 'Praha 13', 'Praha 14',
  'Praha 15', 'Praha 16', 'Praha 17', 'Praha 18', 'Praha 19', 'Praha 20', 'Praha 21', 'Praha 22',
]

const QUALITY_PRESETS = [
  { label: 'Vše', min: '', max: '' },
  { label: 'Excelentní (80+)', min: '80', max: '' },
  { label: 'Dobrá (50+)', min: '50', max: '' },
  { label: 'Základní (20-49)', min: '20', max: '49' },
  { label: 'Prázdná (0-19)', min: '0', max: '19' },
]

const PAGE_SIZE = 20

// ── Styles ──────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--card-bg, #fff)',
  borderRadius: 12,
  border: '1px solid var(--border, #e5e7eb)',
  padding: 20,
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--border, #d1d5db)',
  fontSize: '0.82rem',
  background: 'var(--input-bg, #fff)',
}

// ── Component ───────────────────────────────────────

export default function CrmBuildingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const city = searchParams.get('city') || 'Praha'
  const district = searchParams.get('district') || ''
  const q = searchParams.get('q') || ''
  const minQuality = searchParams.get('minQuality') || ''
  const maxQuality = searchParams.get('maxQuality') || ''
  const hasOrganization = searchParams.get('hasOrganization') || ''
  const sort = searchParams.get('sort') || 'dataQualityScore'
  const order = searchParams.get('order') || 'desc'
  const page = Number(searchParams.get('page') || '1')

  const [searchInput, setSearchInput] = useState(q)

  const offset = (page - 1) * PAGE_SIZE

  const { data: result, isLoading } = useQuery<BuildingsResponse>({
    queryKey: ['crm-buildings', city, district, q, minQuality, maxQuality, hasOrganization, sort, order, page],
    queryFn: () => {
      const params: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(offset) }
      if (city) params.city = city
      if (district) params.district = district
      if (q) params.q = q
      if (minQuality) params.minQuality = minQuality
      if (maxQuality) params.maxQuality = maxQuality
      if (hasOrganization) params.hasOrganization = hasOrganization
      if (sort) params.sort = sort
      if (order) params.order = order
      return apiClient.get('/knowledge-base/buildings', { params }).then(r => r.data)
    },
  })

  const totalPages = Math.ceil((result?.total || 0) / PAGE_SIZE)

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setSearchParams(next)
  }

  const setSort = (field: string) => {
    const next = new URLSearchParams(searchParams)
    if (sort === field && order === 'desc') {
      next.set('order', 'asc')
    } else if (sort === field && order === 'asc') {
      next.delete('sort')
      next.delete('order')
    } else {
      next.set('sort', field)
      next.set('order', 'desc')
    }
    next.set('page', '1')
    setSearchParams(next)
  }

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
  }

  const handleSearch = () => {
    setFilter('q', searchInput)
  }

  const sortIcon = (field: string) => {
    if (sort !== field) return ''
    return order === 'desc' ? ' ↓' : ' ↑'
  }

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Building2 size={22} />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Budovy</h1>
        {result && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Nalezeno: {result.total.toLocaleString('cs-CZ')} budov
          </span>
        )}
      </div>

      {/* Filters */}
      <div style={{ ...card, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '12px 16px' }}>
        <select value={city} onChange={e => setFilter('city', e.target.value)} style={inputStyle}>
          <option value="Praha">Praha</option>
          <option value="Brno">Brno</option>
          <option value="Ostrava">Ostrava</option>
          <option value="Plzeň">Plzeň</option>
        </select>

        <select value={district} onChange={e => setFilter('district', e.target.value)} style={inputStyle}>
          <option value="">Všechny MČ</option>
          {PRAHA_DISTRICTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={`${minQuality}-${maxQuality}`} onChange={e => {
          const [min, max] = e.target.value.split('-')
          const next = new URLSearchParams(searchParams)
          if (min) next.set('minQuality', min); else next.delete('minQuality')
          if (max) next.set('maxQuality', max); else next.delete('maxQuality')
          next.set('page', '1')
          setSearchParams(next)
        }} style={inputStyle}>
          {QUALITY_PRESETS.map(p => (
            <option key={p.label} value={`${p.min}-${p.max}`}>{p.label}</option>
          ))}
        </select>

        <select value={hasOrganization} onChange={e => setFilter('hasOrganization', e.target.value)} style={inputStyle}>
          <option value="">Organizace: vše</option>
          <option value="true">S organizací</option>
          <option value="false">Bez organizace</option>
        </select>

        <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 200 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Hledat adresu, IČO, organizaci..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Načítám...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={thStyle} onClick={() => setSort('street')}>Adresa{sortIcon('street')}</th>
                    <th style={thStyle} onClick={() => setSort('district')}>MČ{sortIcon('district')}</th>
                    <th style={thStyle}>Typ</th>
                    <th style={thStyle}>Organizace</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>IČO</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Jedn.</th>
                    <th style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }} onClick={() => setSort('dataQualityScore')}>
                      Quality{sortIcon('dataQualityScore')}
                    </th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => setSort('lastEnrichedAt')}>
                      Enrichment{sortIcon('lastEnrichedAt')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result?.data.map(b => (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/crm/buildings/${b.id}`)}
                      style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light, #f9fafb)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500 }}>{b.street || b.fullAddress?.split(',')[0] || '—'}</span>
                        {b.houseNumber && <span> {b.houseNumber}</span>}
                      </td>
                      <td style={tdStyle}>{b.district || '—'}</td>
                      <td style={tdStyle}>
                        {b.managingOrg?.orgType ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: b.managingOrg.orgType === 'SVJ' ? '#dbeafe' : '#fce7f3', color: b.managingOrg.orgType === 'SVJ' ? '#1d4ed8' : '#be185d' }}>
                            {b.managingOrg.orgType}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.managingOrg?.name || '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem' }}>
                        {b.managingOrg?.ico || '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{b._count?.units || b.numberOfUnits || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <QualityBadge score={b.dataQualityScore || 0} />
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {b.lastEnrichedAt ? formatRelativeDate(b.lastEnrichedAt) : 'nikdy'}
                      </td>
                    </tr>
                  ))}
                  {(!result?.data || result.data.length === 0) && (
                    <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Žádné budovy</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16, fontSize: '0.82rem' }}>
                <button
                  style={{ ...inputStyle, cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page > 1 ? 1 : 0.4 }}
                  onClick={() => page > 1 && setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={14} />
                </button>
                {paginationRange(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(Number(p))}
                      style={{
                        ...inputStyle,
                        cursor: 'pointer',
                        fontWeight: Number(p) === page ? 700 : 400,
                        background: Number(p) === page ? 'var(--primary, #0d9488)' : 'var(--input-bg, #fff)',
                        color: Number(p) === page ? '#fff' : 'inherit',
                        minWidth: 32,
                        textAlign: 'center',
                      }}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  style={{ ...inputStyle, cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page < totalPages ? 1 : 0.4 }}
                  onClick={() => page < totalPages && setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight size={14} />
                </button>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{PAGE_SIZE}/stránka</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────

const thStyle: React.CSSProperties = { padding: '8px 8px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '8px 8px' }

function QualityBadge({ score }: { score: number }) {
  const color = score >= 60 ? '#16a34a' : score >= 30 ? '#d97706' : '#dc2626'
  const bg = score >= 60 ? '#dcfce7' : score >= 30 ? '#fef3c7' : '#fee2e2'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
      <div style={{ width: 40, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color, background: bg, padding: '1px 5px', borderRadius: 4, minWidth: 26, textAlign: 'center' }}>
        {score}
      </span>
    </div>
  )
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'dnes'
  if (diffDays === 1) return 'včera'
  if (diffDays < 7) return `před ${diffDays} dny`
  if (diffDays < 30) return `před ${Math.floor(diffDays / 7)} týdny`
  return date.toLocaleDateString('cs-CZ')
}

function paginationRange(current: number, total: number): (string | number)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (string | number)[] = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }
  return pages
}
