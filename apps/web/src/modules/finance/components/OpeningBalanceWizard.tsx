import { useState, useMemo } from 'react'
import { Modal, Button, LoadingState, EmptyState } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useProperties } from '../../properties/use-properties'
import { useOpeningBalanceStatus, useSetBulkOpeningBalances } from '../api/opening-balance.queries'
import type { BulkOpeningBalanceResult } from '../api/opening-balance.api'

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(n)
}

type Step = 'config' | 'entry' | 'result'

interface Props {
  propertyId?: string
  onClose: () => void
}

export default function OpeningBalanceWizard({ propertyId: initialPropertyId, onClose }: Props) {
  const toast = useToast()
  const { data: properties = [] } = useProperties()
  const [propertyId, setPropertyId] = useState(initialPropertyId || '')
  if (!propertyId && properties.length > 0 && !initialPropertyId) setPropertyId(properties[0].id)

  const [step, setStep] = useState<Step>('config')
  const [cutoverDate, setCutoverDate] = useState(new Date().toISOString().slice(0, 10))
  const [balances, setBalances] = useState<Record<string, { amount: string; note: string }>>({})
  const [result, setResult] = useState<BulkOpeningBalanceResult | null>(null)

  const { data: status = [], isLoading } = useOpeningBalanceStatus(step !== 'config' ? propertyId : undefined)
  const bulkMut = useSetBulkOpeningBalances()

  const editableUnits = status.filter(u => !u.hasOpeningBalance && u.residentId)
  const setUnits = status.filter(u => u.hasOpeningBalance)

  const handleLoadUnits = () => {
    if (!propertyId || !cutoverDate) { toast.error('Vyplňte nemovitost a datum přechodu'); return }
    setStep('entry')
  }

  const summary = useMemo(() => {
    let debt = 0, credit = 0
    for (const u of editableUnits) {
      const val = parseFloat(balances[u.unitId]?.amount || '0')
      if (val > 0) debt += val
      if (val < 0) credit += Math.abs(val)
    }
    return { debt, credit, net: debt - credit }
  }, [editableUnits, balances])

  const handleSave = () => {
    const items = editableUnits
      .filter(u => {
        const val = parseFloat(balances[u.unitId]?.amount || '0')
        return val !== 0
      })
      .map(u => ({
        unitId: u.unitId,
        residentId: u.residentId!,
        amount: parseFloat(balances[u.unitId]?.amount || '0'),
        note: balances[u.unitId]?.note || undefined,
      }))

    if (items.length === 0) { toast.error('Zadejte alespoň jeden nenulový zůstatek'); return }

    bulkMut.mutate(
      { propertyId, cutoverDate, balances: items },
      {
        onSuccess: (data) => { setResult(data); setStep('result'); toast.success(`Nastaveno ${data.set} počátečních stavů`) },
        onError: () => toast.error('Chyba při ukládání'),
      },
    )
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' }
  const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--border)' }

  return (
    <Modal open onClose={onClose} wide
      title={step === 'config' ? 'Počáteční stavy' : step === 'entry' ? 'Zadání zůstatků' : 'Hotovo'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {step === 'config' && <>
            <Button onClick={onClose}>Zrušit</Button>
            <Button variant="primary" onClick={handleLoadUnits} disabled={!propertyId || !cutoverDate}>Načíst jednotky</Button>
          </>}
          {step === 'entry' && <>
            <Button onClick={() => setStep('config')}>← Zpět</Button>
            <Button variant="primary" onClick={handleSave} disabled={bulkMut.isPending}>
              {bulkMut.isPending ? 'Ukládám...' : 'Uložit počáteční stavy'}
            </Button>
          </>}
          {step === 'result' && <Button variant="primary" onClick={onClose}>Hotovo</Button>}
        </div>
      }
    >
      {/* CONFIG */}
      {step === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {properties.length > 1 && (
            <div>
              <label className="form-label">Nemovitost</label>
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={inputStyle}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="form-label">Datum přechodu na ifmio *</label>
            <input type="date" value={cutoverDate} onChange={e => setCutoverDate(e.target.value)} style={inputStyle} />
            <div className="text-muted" style={{ fontSize: '.82rem', marginTop: 4 }}>
              Od tohoto data ifmio přebírá správu. Dluhy/přeplatky k tomuto datu zadejte níže.
            </div>
          </div>
        </div>
      )}

      {/* ENTRY */}
      {step === 'entry' && (
        <div>
          {isLoading ? <LoadingState text="Načítání..." /> : (
            <>
              {setUnits.length > 0 && (
                <div style={{ marginBottom: 12, fontSize: '.85rem', color: 'var(--text-muted)' }}>
                  Již nastaveno: {setUnits.length} jednotek
                </div>
              )}
              {editableUnits.length === 0 ? (
                <EmptyState title="Žádné jednotky k nastavení" description="Všechny jednotky již mají nastavený počáteční stav, nebo nemají přiřazeného vlastníka." />
              ) : (
                <>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', marginBottom: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Jednotka</th>
                          <th style={thStyle}>Vlastník</th>
                          <th style={{ ...thStyle, width: 160 }}>Zůstatek (Kč)</th>
                          <th style={{ ...thStyle, width: 200 }}>Poznámka</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editableUnits.map(u => {
                          const val = parseFloat(balances[u.unitId]?.amount || '0')
                          const color = val > 0 ? '#ef4444' : val < 0 ? '#10b981' : 'var(--text-muted)'
                          return (
                            <tr key={u.unitId}>
                              <td style={tdStyle}><span style={{ fontWeight: 500 }}>{u.unitName}</span></td>
                              <td style={tdStyle}>{u.residentName}</td>
                              <td style={tdStyle}>
                                <input
                                  type="number" step="0.01" placeholder="0 = vyrovnáno"
                                  value={balances[u.unitId]?.amount || ''}
                                  onChange={e => setBalances(b => ({ ...b, [u.unitId]: { ...b[u.unitId], amount: e.target.value, note: b[u.unitId]?.note || '' } }))}
                                  style={{ ...inputStyle, color, fontFamily: 'monospace', fontWeight: 600 }}
                                />
                              </td>
                              <td style={tdStyle}>
                                <input
                                  placeholder="volitelná poznámka"
                                  value={balances[u.unitId]?.note || ''}
                                  onChange={e => setBalances(b => ({ ...b, [u.unitId]: { ...b[u.unitId], amount: b[u.unitId]?.amount || '', note: e.target.value } }))}
                                  style={inputStyle}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div style={{ display: 'flex', gap: 16, fontSize: '.85rem', marginBottom: 8 }}>
                    <span>Celkem dluh: <strong style={{ color: '#ef4444' }}>{fmtCzk(summary.debt)}</strong></span>
                    <span>Celkem přeplatky: <strong style={{ color: '#10b981' }}>{fmtCzk(summary.credit)}</strong></span>
                    <span>Čistý stav: <strong>{fmtCzk(summary.net)}</strong></span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* RESULT */}
      {step === 'result' && result && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
            Počáteční stavy nastaveny pro {result.set} jednotek
          </div>
          {result.skipped > 0 && <div className="text-muted">Přeskočeno (již nastaveno): {result.skipped}</div>}
          {result.errors > 0 && <div style={{ color: '#ef4444' }}>Chyby: {result.errors}</div>}
        </div>
      )}
    </Modal>
  )
}
