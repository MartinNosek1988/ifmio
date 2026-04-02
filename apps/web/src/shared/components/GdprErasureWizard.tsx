import { useState } from 'react'
import { Modal, Button, SearchBar } from './index'
import { PiiBadge } from './PiiField'
import { Shield, AlertTriangle, Check, Download } from 'lucide-react'

interface GdprSubject {
  id: string
  name: string
  email: string
  role: string
  property?: string
}

interface GdprErasureWizardProps {
  open: boolean
  onClose: () => void
  onSearch?: (query: string) => Promise<GdprSubject[]>
  onErase?: (subjectId: string, reason: string) => Promise<{ success: boolean; anonymizedFields: number; retainedRecords: number }>
}

const PII_FIELDS = [
  { field: 'Jméno a příjmení', example: 'Jan Novák', after: 'ANONYMIZOVÁNO' },
  { field: 'Email', example: 'jan@email.cz', after: 'anon_28f4@anon.cz' },
  { field: 'Telefon', example: '+420 777 123 456', after: '—' },
  { field: 'Datum narození', example: '15.5.1985', after: '—' },
  { field: 'Číslo účtu', example: '1234567890/0100', after: '—' },
  { field: 'Adresa', example: 'Korunní 42, Praha 2', after: '—' },
]

const RETAINED_RECORDS = [
  { category: 'Účetní záznamy', reason: 'Zákon o účetnictví — archivace 5 let', count: '12 faktur, 36 předpisů' },
  { category: 'Protokoly shromáždění', reason: 'NOZ — archivace 10 let', count: '3 hlasovací záznamy' },
]

export function GdprErasureWizard({ open, onClose, onSearch, onErase }: GdprErasureWizardProps) {
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<GdprSubject[]>([])
  const [selected, setSelected] = useState<GdprSubject | null>(null)
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ anonymizedFields: number; retainedRecords: number } | null>(null)

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.length < 2) { setResults([]); return }
    if (onSearch) {
      const r = await onSearch(q)
      setResults(r)
    } else {
      // TODO: napojit na GET /api/v1/residents?search=...
      setResults([])
    }
  }

  const handleErase = async () => {
    if (!selected || !reason.trim()) return
    setIsProcessing(true)
    try {
      if (onErase) {
        const res = await onErase(selected.id, reason)
        if (res.success) setResult(res)
      } else {
        // TODO: napojit na POST /api/v1/admin/gdpr/erase
        setResult({ anonymizedFields: PII_FIELDS.length, retainedRecords: RETAINED_RECORDS.length })
      }
      setStep(5)
    } catch {
      // error handled by caller
    } finally {
      setIsProcessing(false)
    }
  }

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  return (
    <Modal open onClose={onClose} title="" wide>
      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} style={{
            width: 32, height: 4, borderRadius: 2,
            background: s <= step ? 'var(--primary)' : 'var(--gray-200)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>

      {/* Step 1: Search */}
      {step === 1 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>GDPR výmaz — Krok 1: Vyhledání subjektu</h3>
          </div>
          <SearchBar placeholder="Hledat podle jména, emailu nebo IČO..." onSearch={handleSearch} />
          {results.length > 0 && (
            <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
              {results.map((r) => (
                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}>
                  <input type="radio" name="subject" checked={selected?.id === r.id} onChange={() => setSelected(r)} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.email} — {r.role}{r.property ? `, ${r.property}` : ''}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && results.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Žádné výsledky</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={onClose}>Zrušit</Button>
            <Button variant="primary" onClick={() => setStep(2)} disabled={!selected}>Další</Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview anonymization */}
      {step === 2 && selected && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Krok 2: Co bude anonymizováno</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Subjekt: <strong>{selected.name}</strong></p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Pole <PiiBadge /></th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Aktuální hodnota</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Po anonymizaci</th>
              </tr>
            </thead>
            <tbody>
              {PII_FIELDS.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{f.field}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{f.example}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--danger)', fontWeight: 500 }}>{f.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Button onClick={() => setStep(1)}>Zpět</Button>
            <Button variant="primary" onClick={() => setStep(3)}>Další</Button>
          </div>
        </div>
      )}

      {/* Step 3: Retained records */}
      {step === 3 && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Krok 3: Co NEBUDE smazáno</h3>
          <div style={{ background: 'var(--warning-light, #fef3c7)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>
              <AlertTriangle size={16} /> Zákonná povinnost archivace
            </div>
            {RETAINED_RECORDS.map((r, i) => (
              <div key={i} style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: 6 }}>
                <strong>{r.category}</strong> ({r.reason})<br />
                <span style={{ fontSize: '0.78rem' }}>{r.count}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Tyto záznamy budou anonymizovány (jméno nahrazeno), ale ponechány v systému.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Button onClick={() => setStep(2)}>Zpět</Button>
            <Button variant="primary" onClick={() => setStep(4)}>Další</Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && selected && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Krok 4: Potvrzení GDPR výmazu</h3>
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: '0.85rem' }}>
            <div>Subjekt: <strong>{selected.name}</strong> ({selected.email})</div>
            <div>Anonymizováno bude: <strong>{PII_FIELDS.length} osobních polí</strong></div>
            <div>Ponecháno bude: <strong>{RETAINED_RECORDS.length} kategorií</strong> (anonymizovaně)</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Důvod výmazu *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Uveďte důvod (žádost subjektu údajů, dle GDPR čl. 17...)"
              style={{ ...inputStyle, minHeight: 60 }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" required />
            Potvrzuji, že výmaz je v souladu s GDPR článek 17
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setStep(3)}>Zpět</Button>
            <Button variant="danger" onClick={handleErase} disabled={!reason.trim() || isProcessing}>
              {isProcessing ? 'Zpracovávám...' : 'Provést anonymizaci'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Result */}
      {step === 5 && result && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--success-light, #d1fae5)', color: 'var(--success)', marginBottom: 16 }}>
            <Check size={28} />
          </div>
          <h3 style={{ margin: '0 0 12px' }}>GDPR výmaz dokončen</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Anonymizováno: <strong>{result.anonymizedFields} polí</strong><br />
            Ponecháno (anonymizovaně): <strong>{result.retainedRecords} kategorií</strong>
          </p>
          <Button size="sm" onClick={() => { /* TODO: download PDF */ }}>
            <Download size={14} /> Stáhnout PDF protokol
          </Button>
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={onClose}>Zavřít</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
