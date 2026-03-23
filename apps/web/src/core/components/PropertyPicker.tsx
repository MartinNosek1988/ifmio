import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Building2, ChevronDown, ChevronRight, UsersRound } from 'lucide-react'
import { useProperties } from '../../modules/properties/use-properties'
import { useManagementContracts, type ApiManagementContract } from '../../modules/properties/management-contracts-api'
import type { ApiProperty } from '../../modules/properties/properties-api'
import { usePropertyPickerStore } from '../stores/property-picker.store'

const MGMT_TYPE_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  hoa_management: { label: 'SVJ', bg: 'rgba(59,130,246,.15)', fg: '#3b82f6' },
  rental_management: { label: 'Pronájem', bg: 'rgba(239,68,68,.12)', fg: '#ef4444' },
  technical_management: { label: 'Technická', bg: 'rgba(107,114,128,.12)', fg: '#6b7280' },
  accounting_management: { label: 'Účetní', bg: 'rgba(245,158,11,.12)', fg: '#d97706' },
  admin_management: { label: 'Administrativní', bg: 'rgba(139,92,246,.12)', fg: '#8b5cf6' },
}

const PRINCIPAL_TYPE_LABELS: Record<string, string> = {
  hoa: 'SVJ',
  individual_owner: 'Vlastník FO',
  corporate_owner: 'Vlastník PO',
  tenant_client: 'Klient nájemce',
  mixed_client: 'Smíšený',
}

interface Props {
  open: boolean
  onClose: () => void
}

type Mode = 'search' | 'principals'

export function PropertyPicker({ open, onClose }: Props) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')

  // Lazy-fetch: only when open
  const { data: properties = [] } = useProperties()
  const { data: allContracts = [] } = useManagementContracts({ isActive: true })

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const setGlobalProperty = usePropertyPickerStore(s => s.setProperty)

  const handleSelectProperty = useCallback((propertyId: string) => {
    setGlobalProperty(propertyId)
    navigate(`/properties/${propertyId}`)
    onClose()
  }, [navigate, onClose, setGlobalProperty])

  const handleSelectPrincipal = useCallback((principalId: string) => {
    navigate(`/principals/${principalId}`)
    onClose()
  }, [navigate, onClose])

  // Build contract map: propertyId → contracts
  const contractsByProperty = useMemo(() => {
    const map: Record<string, ApiManagementContract[]> = {}
    for (const c of allContracts) {
      if (!map[c.propertyId]) map[c.propertyId] = []
      map[c.propertyId].push(c)
    }
    return map
  }, [allContracts])

  // Filter properties for search mode
  const filteredProperties = useMemo(() => {
    if (!query) return properties
    const q = query.toLowerCase()
    return properties.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      (p.ico && p.ico.includes(q))
    )
  }, [properties, query])

  // Group by principal for principal mode
  const principalGroups = useMemo(() => {
    const map: Record<string, {
      id: string
      displayName: string
      type: string
      properties: Array<{ id: string; name: string; address: string; unitCount: number }>
    }> = {}

    for (const c of allContracts) {
      if (!c.property) continue
      if (!map[c.principalId]) {
        map[c.principalId] = {
          id: c.principalId,
          displayName: c.principal.displayName,
          type: c.type,
          properties: [],
        }
      }
      const group = map[c.principalId]
      // Deduplicate properties within the same principal
      if (!group.properties.find(p => p.id === c.propertyId)) {
        const prop = properties.find(p => p.id === c.propertyId)
        group.properties.push({
          id: c.propertyId,
          name: c.property.name,
          address: c.property.address,
          unitCount: prop?.units?.length ?? 0,
        })
      }
    }

    // Also add properties without contracts
    for (const p of properties) {
      if (!allContracts.some(c => c.propertyId === p.id)) {
        const key = '__unassigned'
        if (!map[key]) {
          map[key] = { id: '', displayName: 'Bez přiřazení', type: '', properties: [] }
        }
        map[key].properties.push({
          id: p.id,
          name: p.name,
          address: [p.address, p.city].filter(Boolean).join(', '),
          unitCount: p.units?.length ?? 0,
        })
      }
    }

    let groups = Object.values(map)

    // Filter by query in principal mode
    if (query) {
      const q = query.toLowerCase()
      groups = groups.filter(g =>
        g.displayName.toLowerCase().includes(q) ||
        g.properties.some(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      )
    }

    return groups.sort((a, b) => a.displayName.localeCompare(b.displayName, 'cs'))
  }, [allContracts, properties, query])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} />

      {/* Container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative', width: '100%', maxWidth: 520,
          background: 'var(--surface, #fff)', borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,.25)',
          border: '1px solid var(--border, #e5e7eb)', overflow: 'hidden',
        }}
      >
        {/* Mode tabs + Search */}
        <div style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <button
              onClick={() => setMode('search')}
              style={{
                flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                border: 'none', borderBottom: mode === 'search' ? '2px solid var(--primary, #6366f1)' : '2px solid transparent',
                background: 'transparent', color: mode === 'search' ? 'var(--primary, #6366f1)' : 'var(--text-muted, #6b7280)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <Building2 size={14} /> Nemovitosti
            </button>
            <button
              onClick={() => setMode('principals')}
              style={{
                flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                border: 'none', borderBottom: mode === 'principals' ? '2px solid var(--primary, #6366f1)' : '2px solid transparent',
                background: 'transparent', color: mode === 'principals' ? 'var(--primary, #6366f1)' : 'var(--text-muted, #6b7280)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <UsersRound size={14} /> Dle klientů
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }}>
            <Search size={16} color="var(--text-muted, #9ca3af)" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={mode === 'search' ? 'Hledat nemovitost...' : 'Hledat klienta nebo nemovitost...'}
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: '0.85rem',
                background: 'transparent', color: 'var(--text, #111)',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'var(--surface-2, #f3f4f6)', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Esc
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {mode === 'search' ? (
            <SearchMode
              properties={filteredProperties}
              contractsByProperty={contractsByProperty}
              onSelect={handleSelectProperty}
            />
          ) : (
            <PrincipalMode
              groups={principalGroups}
              onSelectProperty={handleSelectProperty}
              onSelectPrincipal={handleSelectPrincipal}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Search Mode ────────────────────────────────────────────────────

function SearchMode({
  properties,
  contractsByProperty,
  onSelect,
}: {
  properties: ApiProperty[]
  contractsByProperty: Record<string, ApiManagementContract[]>
  onSelect: (id: string) => void
}) {
  const { selectedPropertyId, clear } = usePropertyPickerStore()

  if (properties.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <Building2 size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Žádné nemovitosti</div>
        <div>Zatím nemáte žádné nemovitosti. Začněte přidáním první nemovitosti.</div>
      </div>
    )
  }

  return (
    <>
      {/* "All properties" option */}
      {selectedPropertyId && (
        <div
          onClick={() => { clear(); }}
          style={{
            padding: '10px 14px', cursor: 'pointer',
            borderBottom: '1px solid var(--border, #e5e7eb)',
            background: 'var(--surface-2, #f9fafb)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2, #f9fafb)' }}
          data-testid="property-picker-all"
        >
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary, #6366f1)' }}>
            Všechny nemovitosti
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Zrušit filtr nemovitosti</div>
        </div>
      )}
      {properties.map(p => {
        const contracts = contractsByProperty[p.id] ?? []
        const unitCount = p.units?.length ?? 0
        const isSelected = selectedPropertyId === p.id
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              padding: '10px 14px', cursor: 'pointer',
              borderBottom: '1px solid var(--border, #e5e7eb)',
              borderLeft: isSelected ? '3px solid var(--primary, #6366f1)' : '3px solid transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2, #f9fafb)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                {unitCount} jedn.
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {[p.address, p.city].filter(Boolean).join(', ')}
            </div>
            {contracts.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {contracts.map(c => {
                  const b = MGMT_TYPE_BADGE[c.type] ?? { label: c.type, bg: 'rgba(107,114,128,.12)', fg: '#6b7280' }
                  return (
                    <span
                      key={c.id}
                      style={{
                        fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4,
                        background: b.bg, color: b.fg, fontWeight: 600,
                      }}
                    >
                      {b.label} · {c.principal.displayName}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// ─── Principal Mode ─────────────────────────────────────────────────

function PrincipalMode({
  groups,
  onSelectProperty,
  onSelectPrincipal,
}: {
  groups: Array<{
    id: string
    displayName: string
    type: string
    properties: Array<{ id: string; name: string; address: string; unitCount: number }>
  }>
  onSelectProperty: (id: string) => void
  onSelectPrincipal: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    groups.forEach(g => { init[g.id || '__unassigned'] = true })
    return init
  })

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  if (groups.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <UsersRound size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Žádní klienti</div>
        <div>Zatím nemáte žádné klienty.</div>
      </div>
    )
  }

  return (
    <>
      {groups.map(group => {
        const key = group.id || '__unassigned'
        const isOpen = expanded[key] !== false
        const typeLabel = PRINCIPAL_TYPE_LABELS[group.type] ?? ''
        return (
          <div key={key}>
            {/* Principal header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', background: 'var(--surface-2, #f3f4f6)',
                borderBottom: '1px solid var(--border, #e5e7eb)', cursor: 'pointer',
                fontSize: '0.85rem',
              }}
              onClick={() => toggle(key)}
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span
                style={{ fontWeight: 600, cursor: group.id ? 'pointer' : 'default' }}
                onClick={group.id ? (e) => { e.stopPropagation(); onSelectPrincipal(group.id) } : undefined}
                title={group.id ? 'Přejít na detail klienta' : undefined}
              >
                {group.displayName}
              </span>
              {typeLabel && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  [{typeLabel}]
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {group.properties.length} {group.properties.length === 1 ? 'nem.' : 'nem.'}
              </span>
            </div>
            {/* Properties under principal */}
            {isOpen && group.properties.map(prop => (
              <div
                key={prop.id}
                onClick={() => onSelectProperty(prop.id)}
                style={{
                  padding: '8px 14px 8px 36px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border, #e5e7eb)',
                  fontSize: '0.83rem',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2, #f9fafb)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span>{prop.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                    {prop.unitCount} jedn.
                  </span>
                </div>
                {prop.address && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prop.address}</div>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}
