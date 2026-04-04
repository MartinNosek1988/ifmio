import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Button } from '../../shared/components'
import { Upload, AlertTriangle, Check } from 'lucide-react'

interface CuzkOwner { name: string; address: string; share: string | null; isSJM: boolean; isLegalEntity: boolean }
interface CuzkParsedUnit {
  unitNumber: string; usage: string; commonAreaShare: string; commonAreaSharePercent: number
  owners: CuzkOwner[]; restrictions: string[]; protections: string[]
  cadastralTerritory: string; cadastralTerritoryCode: string; buildingNumber: string; parcelNumber: string
  dataValidAt: string; lvNumber: string
}
interface CuzkImportResult {
  buildingNumber: string; parcelNumber: string; cadastralTerritory: string; cadastralTerritoryCode: string
  units: CuzkParsedUnit[]
}
interface RuianAddress { label: string; street: string; city: string; postalCode: string }

export default function CuzkImportTab({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<CuzkImportResult | null>(null)
  const [form, setForm] = useState({ propertyName: '', propertyAddress: '', propertyCity: '', postalCode: '', propertyType: 'SVJ', ownership: 'vlastnictvi' })
  const [error, setError] = useState('')
  const [showValidation, setShowValidation] = useState(false)

  // Address autocomplete state
  const [addressQuery, setAddressQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)

  // Debounced RÚIAN query
  const { data: suggestions = [] } = useQuery<RuianAddress[]>({
    queryKey: ['ruian', 'address', addressQuery],
    queryFn: () => apiClient.get('/integrations/ruian/address', { params: { q: addressQuery } }).then(r => r.data),
    enabled: addressQuery.length >= 3,
    staleTime: 30_000,
  })

  // Debounce address input
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const handleAddressChange = useCallback((value: string) => {
    setForm(f => ({ ...f, propertyAddress: value }))
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = setTimeout(() => {
      setAddressQuery(value)
      if (value.length >= 3) setShowDropdown(true)
    }, 400)
  }, [])

  // Select suggestion
  const selectSuggestion = useCallback((s: RuianAddress) => {
    setForm(f => ({
      ...f,
      propertyAddress: s.street || s.label.split(',')[0]?.trim() || f.propertyAddress,
      propertyCity: s.city || f.propertyCity,
      postalCode: s.postalCode?.replace(/\s/g, '') || f.postalCode,
    }))
    setShowDropdown(false)
    setSelectedIdx(-1)
  }, [])

  // Keyboard navigation
  const handleAddressKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && selectedIdx >= 0) { e.preventDefault(); selectSuggestion(suggestions[selectedIdx]) }
    if (e.key === 'Escape') setShowDropdown(false)
  }, [showDropdown, suggestions, selectedIdx, selectSuggestion])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          addressInputRef.current && !addressInputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const parseMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await apiClient.post('/properties/import/cuzk', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return res.data as CuzkImportResult
    },
    onSuccess: (data) => {
      setPreview(data)
      // Auto-fill from parsed data
      const addr = `č.p. ${data.buildingNumber}`
      setForm(f => ({
        ...f,
        propertyName: `Č.p. ${data.buildingNumber}`,
        propertyAddress: addr,
        propertyCity: data.cadastralTerritory || f.propertyCity,
      }))
      // Auto-trigger RÚIAN lookup for PSČ
      const ruianQuery = `${data.buildingNumber}, ${data.cadastralTerritory}`
      setAddressQuery(ruianQuery)
      // Auto-fill from first result after a short delay
      setTimeout(async () => {
        try {
          const res = await apiClient.get('/integrations/ruian/address', { params: { q: ruianQuery } })
          const results: RuianAddress[] = res.data ?? []
          if (results.length === 1) {
            // Exactly 1 result — auto-fill silently
            setForm(f => ({
              ...f,
              propertyAddress: results[0].street || f.propertyAddress,
              propertyCity: results[0].city || f.propertyCity,
              postalCode: results[0].postalCode?.replace(/\s/g, '') || f.postalCode,
            }))
          } else if (results.length > 1) {
            // Multiple results — show dropdown for user to pick
            setShowDropdown(true)
          }
        } catch { /* ignore — user can fill manually */ }
      }, 300)
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Nepodařilo se parsovat soubor'),
  })

  const confirmMut = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/properties/import/cuzk/confirm', { importData: preview, ...form })
      return res.data
    },
    onSuccess: (data) => { onClose(); navigate(`/properties/${data.id}`) },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Import se nezdařil'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setPreview(null)
    parseMut.mutate(file)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box', fontSize: '.85rem' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }
  const errBorder = (field: string) => showValidation && !(form as any)[field] ? 'var(--danger, #ef4444)' : undefined

  return (
    <div>
      <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontSize: '.82rem', color: '#b45309' }}>Data z katastru mají informativní charakter. Ověřte údaje před importem.</span>
      </div>

      {!preview && (
        <div onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2, var(--surface))' }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = '' }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = ''; const file = e.dataTransfer.files?.[0]; if (file) parseMut.mutate(file) }}
        >
          <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <p style={{ fontWeight: 600, fontSize: '.9rem', margin: '0 0 4px' }}>{parseMut.isPending ? 'Parsování...' : 'Nahrajte soubor z Domsys ČÚZK rozšíření'}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', margin: 0 }}>Přetáhněte JSON soubor nebo klikněte pro výběr</p>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      )}

      {error && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '8px 12px', fontSize: '.85rem', color: 'var(--danger)', marginTop: 12 }}>{error}</div>}

      {preview && (
        <div>
          <div style={{ background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Stavba č.p. {preview.buildingNumber}, parcela {preview.parcelNumber}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginTop: 2 }}>{preview.cadastralTerritory} [{preview.cadastralTerritoryCode}]</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginTop: 4 }}>
              Nalezeno <strong>{preview.units.length}</strong> jednotek
              {preview.units[0]?.dataValidAt && <span> · Data platná k: {preview.units[0].dataValidAt}</span>}
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto', marginBottom: 16, maxHeight: 300 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2, var(--surface))' }}>
                  {['Jednotka', 'Využití', 'Podíl', 'Vlastník', 'Omezení'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontWeight: 600, fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.units.map(u => (
                  <tr key={u.unitNumber}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontWeight: 500, fontFamily: 'monospace' }}>{u.unitNumber}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{u.usage.length > 20 ? u.usage.slice(0, 20) + '...' : u.usage}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '.78rem' }}>{u.commonAreaShare || '—'}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
                      {u.owners[0]?.name || '—'}
                      {u.owners.length > 1 && <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}> +{u.owners.length - 1}</span>}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
                      {u.restrictions.length > 0
                        ? <span style={{ fontSize: '.72rem', color: '#f59e0b', fontWeight: 600 }}>{u.restrictions.length}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Property details form */}
          <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Údaje nemovitosti</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Název *</label>
              <input value={form.propertyName} onChange={e => setForm(f => ({ ...f, propertyName: e.target.value }))} style={{ ...inputStyle, borderColor: errBorder('propertyName') }} />
              {showValidation && !form.propertyName && <div style={{ color: 'var(--danger, #ef4444)', fontSize: '.72rem', marginTop: 2 }}>Povinné pole</div>}
            </div>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Adresa *</label>
              <input ref={addressInputRef} value={form.propertyAddress}
                onChange={e => handleAddressChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true) }}
                onKeyDown={handleAddressKeyDown}
                style={{ ...inputStyle, borderColor: errBorder('propertyAddress') }} placeholder="Sokolská 1883" />
              {showValidation && !form.propertyAddress && <div style={{ color: 'var(--danger, #ef4444)', fontSize: '.72rem', marginTop: 2 }}>Povinné pole</div>}

              {/* Autocomplete dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div ref={dropdownRef} style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto', marginTop: 2,
                }}>
                  {suggestions.slice(0, 6).map((s, i) => (
                    <div key={i} onClick={() => selectSuggestion(s)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: '.82rem',
                        background: i === selectedIdx ? 'var(--surface-2, rgba(99,102,241,0.06))' : 'transparent',
                        borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : undefined,
                      }}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <div style={{ fontWeight: 500 }}>{s.street || s.label.split(',')[0]}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
                        {s.postalCode && `${s.postalCode} `}{s.city}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Město *</label>
              <input value={form.propertyCity} onChange={e => setForm(f => ({ ...f, propertyCity: e.target.value }))} style={{ ...inputStyle, borderColor: errBorder('propertyCity') }} />
              {showValidation && !form.propertyCity && <div style={{ color: 'var(--danger, #ef4444)', fontSize: '.72rem', marginTop: 2 }}>Povinné pole</div>}
            </div>
            <div>
              <label style={labelStyle}>PSČ *</label>
              <input value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} style={{ ...inputStyle, borderColor: errBorder('postalCode') }} placeholder="11000" />
              {showValidation && !form.postalCode && <div style={{ color: 'var(--danger, #ef4444)', fontSize: '.72rem', marginTop: 2 }}>Povinné pole</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { setPreview(null); setError(''); setShowValidation(false) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.82rem' }}>
              ← Nahrát jiný soubor
            </button>
            <Button variant="primary"
              onClick={() => {
                const isValid = form.propertyName && form.propertyAddress && form.propertyCity && form.postalCode
                if (!isValid) { setShowValidation(true); return }
                confirmMut.mutate()
              }}
              disabled={confirmMut.isPending}
              icon={confirmMut.isPending ? undefined : <Check size={15} />}
            >
              {confirmMut.isPending ? 'Importuji...' : `Importovat ${preview.units.length} jednotek`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
