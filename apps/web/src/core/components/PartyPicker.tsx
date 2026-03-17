import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { apiClient } from '../api/client'

interface PartyOption {
  id: string
  displayName: string
  type: string
  ic: string | null
  email: string | null
}

const TYPE_LABELS: Record<string, string> = {
  person: 'FO',
  company: 'PO',
  hoa: 'SVJ',
  organization_unit: 'OJ',
}

interface Props {
  value: string | null
  onChange: (partyId: string | null, party: PartyOption | null) => void
  placeholder?: string
}

export function PartyPicker({ value, onChange, placeholder = 'Hledat subjekt...' }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: results = [] } = useQuery<PartyOption[]>({
    queryKey: ['parties', 'search', query],
    queryFn: () => apiClient.get('/parties/search', { params: { q: query } }).then(r => r.data),
    enabled: query.length >= 1,
  })

  // Fetch selected party name
  const { data: selectedParty } = useQuery<PartyOption>({
    queryKey: ['parties', 'detail-mini', value],
    queryFn: () => apiClient.get(`/parties/${value}`).then(r => r.data),
    enabled: !!value,
    staleTime: 300_000,
  })

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (party: PartyOption) => {
    onChange(party.id, party)
    setOpen(false)
    setQuery('')
  }

  const handleClear = () => {
    onChange(null, null)
    setQuery('')
  }

  if (value && selectedParty) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', fontSize: '0.85rem' }}>
        <span style={{ fontWeight: 500 }}>{selectedParty.displayName}</span>
        {selectedParty.ic && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>IČ: {selectedParty.ic}</span>}
        <button onClick={handleClear} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}>
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.85rem', background: 'transparent', color: 'var(--text)' }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--surface, #fff)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,.15)', maxHeight: 200, overflowY: 'auto', marginTop: 2,
        }}>
          {results.map(p => (
            <div
              key={p.id}
              onClick={() => handleSelect(p)}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.83rem', borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2, #f3f4f6)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>{p.displayName}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--surface-2, #f3f4f6)', padding: '0 4px', borderRadius: 3 }}>
                  {TYPE_LABELS[p.type] ?? p.type}
                </span>
              </div>
              {(p.ic || p.email) && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {[p.ic && `IČ: ${p.ic}`, p.email].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
