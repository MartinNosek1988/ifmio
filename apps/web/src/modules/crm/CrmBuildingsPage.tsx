import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../core/api/client'
import { Building2, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

// ── Types ───────────────────────────────────────────

interface BuildingRow {
  id: string
  street?: string
  houseNumber?: string
  orientationNumber?: string
  fullAddress?: string
  city: string
  district?: string
  quarter?: string
  cadastralTerritoryName?: string
  postalCode?: string
  buildingType?: string
  numberOfUnits?: number
  dataQualityScore?: number
  lastEnrichedAt?: string
  managingOrg?: { ico: string; name: string; orgType?: string } | null
  _count?: { units: number }
}

interface BuildingsResponse {
  data: BuildingRow[]
  total: number
  limit: number
  offset: number
}

interface TerritoryOption {
  id: string
  code: string
  name: string
  level: string
  hasDistricts?: boolean
  _count?: { buildings: number; children: number }
}

// ── Constants ────────────────────────────────────────

const QUALITY_PRESETS = [
  { label: 'Vše', min: '', max: '' },
  { label: 'Excelentní (80+)', min: '80', max: '' },
  { label: 'Dobrá (50+)', min: '50', max: '' },
  { label: 'Základní (20-49)', min: '20', max: '49' },
  { label: 'Prázdná (0-19)', min: '0', max: '19' },
]

const PAGE_SIZE = 20

// ── Styles ───────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────

export default function CrmBuildingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Territory cascade state
  const krajId = searchParams.get('krajId') || ''
  const okresId = searchParams.get('okresId') || ''
  const obecId = searchParams.get('obecId') || ''
  const mcId = searchParams.get('mcId') || ''
  const kuId = searchParams.get('kuId') || ''

  // Street-level filters
  const street = searchParams.get('street') || ''
  const houseNumber = searchParams.get('houseNumber') || ''
  const orientationNumber = searchParams.get('orientationNumber') || ''

  const q = searchParams.get('q') || ''
  const minQuality = searchParams.get('minQuality') || ''
  const maxQuality = searchParams.get('maxQuality') || ''
  const hasOrganization = searchParams.get('hasOrganization') || ''
  const sort = searchParams.get('sort') || 'dataQualityScore'
  const order = searchParams.get('order') || 'desc'
  const page = Number(searchParams.get('page') || '1')

  const [searchInput, setSearchInput] = useState(q)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null)
  const qc = useQueryClient()

  // The most specific territory selected (for building queries)
  const activeTerritoryId = kuId || mcId || obecId || okresId || krajId

  // Clear selection on filter change
  useEffect(() => setSelected(new Set()), [page, activeTerritoryId, street, houseNumber, orientationNumber])

  const offset = (page - 1) * PAGE_SIZE

  // ── Territory cascade queries ─────────────────────

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

  // MČ: only for cities with districts (Praha, Brno, Ostrava, Plzeň)
  const selectedObec = obce.find(o => o.id === obecId)
  const obecHasDistricts = selectedObec?.hasDistricts ?? false

  const { data: mestskeCasti = [] } = useQuery<TerritoryOption[]>({
    queryKey: ['territories', 'CITY_PART', obecId],
    queryFn: () => apiClient.get('/knowledge-base/territories', { params: { level: 'CITY_PART', parentId: obecId } }).then(r => r.data),
    enabled: !!obecId && obecHasDistricts,
  })

  const { data: katastry = [] } = useQuery<TerritoryOption[]>({
    queryKey: ['territories', 'CADASTRAL', mcId || obecId],
    queryFn: () => apiClient.get('/knowledge-base/territories', { params: { level: 'CADASTRAL', parentId: mcId || obecId } }).then(r => r.data),
    enabled: !!(mcId || (obecId && !obecHasDistricts)),
  })

  // ── Street-level filter options ───────────────────

  const { data: filterOpts } = useQuery<{
    streets: string[]; houseNumbers: string[]; orientationNumbers: string[]
  }>({
    queryKey: ['crm-filter-options', activeTerritoryId, street, houseNumber],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (activeTerritoryId) p.territoryId = activeTerritoryId
      if (street) p.street = street
      if (houseNumber) p.houseNumber = houseNumber
      return apiClient.get('/knowledge-base/buildings/filter-options', { params: p }).then(r => r.data)
    },
    enabled: !!activeTerritoryId,
  })

  // ── Buildings query ────────────────────────────────

  const { data: result, isLoading } = useQuery<BuildingsResponse>({
    queryKey: ['crm-buildings', activeTerritoryId, street, houseNumber, orientationNumber, q, minQuality, maxQuality, hasOrganization, sort, order, page],
    queryFn: () => {
      const params: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(offset) }
      if (activeTerritoryId) params.territoryId = activeTerritoryId
      if (street) params.street = street
      if (houseNumber) params.houseNumber = houseNumber
      if (orientationNumber) params.orientationNumber = orientationNumber
      if (q) params.q = q
      if (minQuality) params.minQuality = minQuality
      if (maxQuality) params.maxQuality = maxQuality
      if (hasOrganization) params.hasOrganization = hasOrganization
      if (sort) params.sort = sort
      if (order) params.order = order
      return apiClient.get('/knowledge-base/buildings', { params }).then(r => r.data)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/knowledge-base/buildings/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-buildings'] }); setConfirmDelete(null) },
  })

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map(id => apiClient.delete(`/knowledge-base/buildings/${id}`)))
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) alert(`${ids.length - failed} smazáno, ${failed} selhalo`)
      return results
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-buildings'] }); setSelected(new Set()) },
  })

  const totalPages = Math.ceil((result?.total || 0) / PAGE_SIZE)

  // Territory cascade keys in order
  const TERRITORY_CASCADE = ['krajId', 'okresId', 'obecId', 'mcId', 'kuId']
  const STREET_CASCADE = ['street', 'houseNumber', 'orientationNumber']

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)

    // Reset all levels below the changed one in territory cascade
    const tIdx = TERRITORY_CASCADE.indexOf(key)
    if (tIdx >= 0) {
      for (let i = tIdx + 1; i < TERRITORY_CASCADE.length; i++) next.delete(TERRITORY_CASCADE[i])
      // Also reset street-level when territory changes
      for (const k of STREET_CASCADE) next.delete(k)
    }
    // Reset street cascade below
    const sIdx = STREET_CASCADE.indexOf(key)
    if (sIdx >= 0) {
      for (let i = sIdx + 1; i < STREET_CASCADE.length; i++) next.delete(STREET_CASCADE[i])
    }

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

      {/* Territory Cascade: Kraj → Okres → Obec → MČ → KÚ */}
      <div style={{ ...card, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'flex-end', padding: '10px 16px' }}>
        <CascadeSelect label="Kraj" value={krajId} options={kraje} onChange={v => setFilter('krajId', v)} />
        <CascadeSelect label="Okres" value={okresId} options={okresy} onChange={v => setFilter('okresId', v)} disabled={!krajId} />
        <CascadeSelect label="Obec" value={obecId} options={obce} onChange={v => setFilter('obecId', v)} disabled={!okresId} />
        {obecHasDistricts && (
          <CascadeSelect label="MČ" value={mcId} options={mestskeCasti} onChange={v => setFilter('mcId', v)} disabled={!obecId} />
        )}
        <CascadeSelect label="KÚ" value={kuId} options={katastry} onChange={v => setFilter('kuId', v)}
          disabled={obecHasDistricts ? !mcId : !obecId} />
      </div>

      {/* Street-level cascade: Ulice → ČP → ČO */}
      {activeTerritoryId && (
        <div style={{ ...card, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'flex-end', padding: '10px 16px' }}>
          <StringCascadeSelect label="Ulice" value={street} options={filterOpts?.streets || []} onChange={v => setFilter('street', v)} />
          <StringCascadeSelect label="ČP" value={houseNumber} options={filterOpts?.houseNumbers || []} onChange={v => setFilter('houseNumber', v)} disabled={!street} />
          <StringCascadeSelect label="ČO" value={orientationNumber} options={filterOpts?.orientationNumbers || []} onChange={v => setFilter('orientationNumber', v)} disabled={!houseNumber} />
        </div>
      )}

      {/* Secondary filters */}
      <div style={{ ...card, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '10px 16px' }}>
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
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Hledat adresu, IČO, organizaci..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div style={{ marginBottom: 8, padding: '8px 16px', background: '#fef3c7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.82rem' }}>
          <span style={{ fontWeight: 500 }}>{selected.size} vybráno</span>
          <button onClick={() => { if (confirm(`Opravdu smazat ${selected.size} budov?`)) bulkDeleteMut.mutate([...selected]) }}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #dc2626', background: '#fee2e2', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            disabled={bulkDeleteMut.isPending}>
            <Trash2 size={13} /> Smazat vybrané
          </button>
          <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Zrušit výběr</button>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Smazat budovu?</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>Opravdu smazat budovu <strong>{confirmDelete.label}</strong>? Smaže se i všechny jednotky, zdroje a vlastnictví.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Zrušit</button>
              <button onClick={() => deleteMut.mutate(confirmDelete.id)} disabled={deleteMut.isPending}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={card}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Načítám...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', position: 'sticky', top: 0, background: 'var(--card-bg, #fff)', zIndex: 1 }}>
                    <th style={{ ...thStyle, width: 36 }}>
                      <input type="checkbox" checked={(result?.data?.length ?? 0) > 0 && selected.size === (result?.data?.length ?? 0)}
                        onChange={e => setSelected(e.target.checked ? new Set((result?.data ?? []).map(b => b.id)) : new Set())} />
                    </th>
                    <th style={thStyle} onClick={() => setSort('city')}>Město{sortIcon('city')}</th>
                    <th style={thStyle} onClick={() => setSort('district')}>MČ{sortIcon('district')}</th>
                    <th style={thStyle}>KÚ</th>
                    <th style={thStyle} onClick={() => setSort('street')}>Ulice{sortIcon('street')}</th>
                    <th style={thStyle} onClick={() => setSort('houseNumber')}>ČP{sortIcon('houseNumber')}</th>
                    <th style={thStyle} onClick={() => setSort('orientationNumber')}>ČO{sortIcon('orientationNumber')}</th>
                    <th style={thStyle}>Organizace</th>
                    <th style={thStyle}>IČO</th>
                    <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => setSort('dataQualityScore')}>
                      Q{sortIcon('dataQualityScore')}
                    </th>
                    <th style={thStyle} onClick={() => setSort('lastEnrichedAt')}>
                      Enrichment{sortIcon('lastEnrichedAt')}
                    </th>
                    <th style={{ ...thStyle, width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {result?.data.map((b, idx) => {
                    const fullAddr = b.fullAddress || [b.street, b.district, b.postalCode].filter(Boolean).join(', ')
                    const streetName = parseStreetName(b.street)
                    const ku = b.quarter || b.cadastralTerritoryName || '—'
                    return (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/crm/buildings/${b.id}`)}
                      style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)', cursor: 'pointer', background: idx % 2 === 1 ? 'var(--border-light, #f9fafb)' : 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 1 ? 'var(--border-light, #f9fafb)' : 'transparent')}
                    >
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(b.id)} onChange={e => {
                          const next = new Set(selected)
                          e.target.checked ? next.add(b.id) : next.delete(b.id)
                          setSelected(next)
                        }} />
                      </td>
                      <td style={tdStyle}>{b.city || '—'}</td>
                      <td style={tdStyle}>{b.district || '—'}</td>
                      <td style={{ ...tdStyle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ku}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{streetName}</td>
                      <td style={tdStyle}>{b.houseNumber || '—'}</td>
                      <td style={tdStyle}>{b.orientationNumber || '—'}</td>
                      <td style={{ ...tdStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.managingOrg?.name || '—'}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.72rem' }}>
                        {b.managingOrg?.ico || '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <QualityBadge score={b.dataQualityScore || 0} />
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {b.lastEnrichedAt ? formatRelativeDate(b.lastEnrichedAt) : 'nikdy'}
                      </td>
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setConfirmDelete({ id: b.id, label: fullAddr })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
                          title="Smazat budovu">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    )
                  })}
                  {(!result?.data || result.data.length === 0) && (
                    <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Building2 size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Žádné budovy v databázi</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 300 }}>
                          {activeTerritoryId ? 'V tomto území nebyly nalezeny žádné budovy.' : 'Spusťte import budov z RÚIAN pro začátek.'}
                        </div>
                        {!activeTerritoryId && (
                          <button onClick={() => navigate('/crm/import')} style={{
                            marginTop: 4, padding: '6px 14px', borderRadius: 8, border: 'none',
                            background: 'var(--primary, #0d9488)', color: '#fff', fontSize: '0.78rem',
                            fontWeight: 600, cursor: 'pointer',
                          }}>
                            Spustit import
                          </button>
                        )}
                      </div>
                    </td></tr>
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

const thStyle: React.CSSProperties = { padding: '6px 6px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontSize: '0.72rem' }
const tdStyle: React.CSSProperties = { padding: '5px 6px' }

/** Extract street name without house numbers: "Korunovační 270/10" → "Korunovační" */
function parseStreetName(street?: string): string {
  if (!street) return '—'
  // "č.p. 30" or "č.p. 654" → no real street name
  if (/^č\.?\s?p\.?\s+\d/i.test(street)) return '—'
  // Remove trailing house number: "Korunovační 270/10" → "Korunovační"
  const cleaned = street.replace(/\s+\d+[\w/\s-]*$/, '').trim()
  return cleaned || '—'
}

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

// Territory cascade select — works with TerritoryOption objects
function CascadeSelect({ label, value, options, onChange, disabled }: {
  label: string; value: string; options: TerritoryOption[]; onChange: (v: string) => void; disabled?: boolean
}) {
  const selectStyle: React.CSSProperties = {
    padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border, #d1d5db)',
    fontSize: '0.78rem', background: disabled ? 'var(--border-light, #f3f4f6)' : 'var(--input-bg, #fff)',
    minWidth: 100, maxWidth: 200,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle} disabled={disabled}>
        <option value="">Vše</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>
            {o.name}{o._count?.buildings ? ` (${o._count.buildings})` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

// String cascade select — works with plain string arrays (for street-level)
function StringCascadeSelect({ label, value, options, onChange, disabled }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean
}) {
  const selectStyle: React.CSSProperties = {
    padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border, #d1d5db)',
    fontSize: '0.78rem', background: disabled ? 'var(--border-light, #f3f4f6)' : 'var(--input-bg, #fff)',
    minWidth: 90, maxWidth: 160,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle} disabled={disabled}>
        <option value="">Vše</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
