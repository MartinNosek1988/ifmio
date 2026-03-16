import React, { useState } from 'react'
import { Modal, Button, Badge } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useGenerateFromComponents } from '../api/components.queries'
import type { GenerationResult } from '../api/components.api'

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
  }).format(n)
}

interface Props {
  propertyId: string
  onClose: () => void
}

type Step = 'config' | 'preview' | 'done'

export default function GenerateFromComponentsWizard({ propertyId, onClose }: Props) {
  const toast = useToast()
  const generateMut = useGenerateFromComponents(propertyId)
  const [step, setStep] = useState<Step>('config')
  const [preview, setPreview] = useState<GenerationResult | null>(null)
  const [result, setResult] = useState<GenerationResult | null>(null)

  // Form state — default to next month
  const now = new Date()
  const defaultMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
  const defaultYear =
    now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const [month, setMonth] = useState(defaultMonth)
  const [year, setYear] = useState(defaultYear)
  const [dueDay, setDueDay] = useState(15)
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)

  const handlePreview = () => {
    generateMut.mutate(
      { month, year, dueDay, dryRun: true },
      {
        onSuccess: (data) => {
          setPreview(data)
          setStep('preview')
        },
        onError: () => toast.error('Chyba při generování náhledu'),
      },
    )
  }

  const handleGenerate = () => {
    generateMut.mutate(
      { month, year, dueDay, dryRun: false },
      {
        onSuccess: (data) => {
          setResult(data)
          setStep('done')
          toast.success(`Vygenerováno ${data.generated} předpisů`)
        },
        onError: () => toast.error('Chyba při generování předpisů'),
      },
    )
  }

  // styles
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)',
    boxSizing: 'border-box',
  }
  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontWeight: 600,
    fontSize: '.8rem',
    color: 'var(--text-muted)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={
        step === 'config'
          ? 'Generovat předpisy ze složek'
          : step === 'preview'
            ? 'Náhled předpisů'
            : 'Předpisy vygenerovány'
      }
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {step === 'config' && (
            <>
              <Button onClick={onClose}>Zrušit</Button>
              <Button
                variant="primary"
                onClick={handlePreview}
                disabled={generateMut.isPending}
              >
                {generateMut.isPending ? 'Počítám...' : 'Zobrazit náhled'}
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button onClick={() => setStep('config')}>&#8592; Zpět</Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={generateMut.isPending}
              >
                {generateMut.isPending
                  ? 'Generuji...'
                  : `Generovat ${preview?.generated ?? 0} předpisů`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button variant="primary" onClick={onClose}>
              Hotovo
            </Button>
          )}
        </div>
      }
    >
      {/* STEP 1: CONFIG */}
      {step === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
            }}
          >
            <div>
              <label className="form-label">Měsíc</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={inputStyle}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Rok</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="form-label">Den splatnosti</label>
              <input
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                min={1}
                max={28}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: '.85rem' }}>
            Předpisy budou vygenerovány na základě aktivních složek předpisu
            přiřazených k jednotkám.
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 'preview' && preview && (
        <div>
          {/* Summary */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 16,
              fontSize: '.85rem',
            }}
          >
            <span>
              Bude vygenerováno:{' '}
              <strong style={{ color: 'var(--success, #10b981)' }}>
                {preview.generated} předpisů
              </strong>
            </span>
            <span>
              Celkem: <strong>{fmtCzk(preview.totalAmount)}</strong>
            </span>
            {preview.skipped > 0 && (
              <span className="text-muted">
                Přeskočeno: {preview.skipped}
              </span>
            )}
          </div>

          {/* Table */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'auto',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '.85rem',
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Jednotka</th>
                  <th style={thStyle}>Vlastník</th>
                  <th style={thStyle}>Složky</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Celkem</th>
                  <th style={thStyle}>Stav</th>
                </tr>
              </thead>
              <tbody>
                {preview.details.map((d) => {
                  const isExpanded = expandedUnit === d.unitId
                  return (
                    <React.Fragment key={d.unitId}>
                      <tr
                        onClick={() =>
                          setExpandedUnit(isExpanded ? null : d.unitId)
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 500 }}>{d.unitName}</span>
                        </td>
                        <td style={tdStyle}>{d.residentName ?? '—'}</td>
                        <td style={tdStyle}>{d.items.length} složek</td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: 'right',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                          }}
                        >
                          {d.amount > 0 ? fmtCzk(d.amount) : '—'}
                        </td>
                        <td style={tdStyle}>
                          {d.status === 'created' && (
                            <Badge variant="green">Bude vytvořen</Badge>
                          )}
                          {d.status === 'skipped_duplicate' && (
                            <Badge variant="yellow">Duplikát</Badge>
                          )}
                          {d.status === 'skipped_no_components' && (
                            <Badge variant="muted">Bez složek</Badge>
                          )}
                          {d.status === 'skipped_unoccupied' && (
                            <Badge variant="muted">Neobsazeno</Badge>
                          )}
                          {d.status === 'error' && (
                            <Badge variant="red">Chyba</Badge>
                          )}
                        </td>
                      </tr>
                      {isExpanded && d.items.length > 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: '0 12px 8px 24px',
                              background: 'var(--surface-2, #f9fafb)',
                            }}
                          >
                            {d.items.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '4px 0',
                                  fontSize: '.82rem',
                                  borderBottom:
                                    idx < d.items.length - 1
                                      ? '1px solid var(--border)'
                                      : 'none',
                                }}
                              >
                                <span>{item.name}</span>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 500,
                                  }}
                                >
                                  {fmtCzk(item.amount)}
                                </span>
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 3: DONE */}
      {step === 'done' && result && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#9989;</div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Vygenerováno {result.generated} předpisů
          </div>
          <div style={{ fontSize: '1.1rem', marginBottom: 16 }}>
            Celkem: <strong>{fmtCzk(result.totalAmount)}</strong>
          </div>
          {result.skipped > 0 && (
            <div className="text-muted" style={{ fontSize: '.85rem' }}>
              Přeskočeno: {result.skipped} jednotek
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
