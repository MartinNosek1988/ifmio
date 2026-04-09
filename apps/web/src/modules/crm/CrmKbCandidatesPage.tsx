import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Download } from 'lucide-react'
import { LoadingSpinner } from '../../shared/components'
import { crmPipelineApi } from './api/crm-pipeline.api'

// ── Types ────────────────────────────────────────

interface KbCandidate {
  id: string
  name: string
  ico: string
  orgType?: string
  city?: string
}

// ── Styles ───────────────────────────────────────

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

// ── Component ────────────────────────────────────

export default function CrmKbCandidatesPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterOrgType, setFilterOrgType] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['crm-pipeline', 'kb-candidates'],
    queryFn: () => crmPipelineApi.kbCandidates(),
  })

  const candidates: KbCandidate[] = (data?.items ?? data?.data ?? data ?? []).filter((c: any) => {
    if (filterOrgType && c.orgType !== filterOrgType) return false
    if (filterCity && !c.city?.toLowerCase().includes(filterCity.toLowerCase())) return false
    return true
  })

  const importMut = useMutation({
    mutationFn: () => crmPipelineApi.importFromKb(Array.from(selected)),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] })
      setSelected(new Set())
      setSuccessMsg(`Uspesne importovano ${result?.imported ?? selected.size} leadu.`)
      setTimeout(() => setSuccessMsg(''), 5000)
    },
  })

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(candidates.map((c) => c.id)))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <select style={inputStyle} value={filterOrgType} onChange={(e) => setFilterOrgType(e.target.value)}>
          <option value="">Vsechny typy</option>
          <option value="SVJ">SVJ</option>
          <option value="BD">BD</option>
        </select>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: 'var(--text-muted)' }} />
          <input
            style={{ ...inputStyle, paddingLeft: 28, width: '100%' }}
            placeholder="Filtrovat mesto..."
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        {selected.size > 0 && (
          <button
            className="btn btn--primary btn--sm"
            onClick={() => importMut.mutate()}
            disabled={importMut.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Download size={14} />
            {importMut.isPending
              ? 'Importuji...'
              : `Importovat vybrane (${selected.size})`}
          </button>
        )}
      </div>

      {/* Success message */}
      {successMsg && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: '#16a34a',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={candidates.length > 0 && selected.size === candidates.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Nazev</th>
                <th>ICO</th>
                <th>Typ</th>
                <th>Mesto</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.ico}</td>
                  <td>{c.orgType ?? '-'}</td>
                  <td>{c.city ?? '-'}</td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    Zadni kandidati
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
