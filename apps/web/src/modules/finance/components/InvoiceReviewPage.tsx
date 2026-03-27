import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, ZoomIn, ZoomOut, RotateCcw, ArrowDownLeft, Plus, Trash2 } from 'lucide-react'
import { Badge, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useInvoice, useUpdateInvoice, useSubmitInvoice, useApproveInvoice, useReturnInvoiceToDraft } from '../api/finance.queries'
import { formatKc } from '../../../shared/utils/format'
import { partiesApi } from '../../parties/api/parties.api'
import type { InvoiceLine } from '../api/finance.api'

const PdfViewer = React.lazy(() => import('./PdfViewer'))

// ─── CONSTANTS ──────────────────────────────────────────────────

type LineWithId = InvoiceLine & { _id: string }

const INVOICE_TYPES: Record<string, string> = {
  received: 'Přijatá', issued: 'Vydaná', proforma: 'Záloha', credit_note: 'Dobropis', internal: 'Interní',
}

const STATUS_BADGES: Record<string, { label: string; variant: string }> = {
  draft: { label: 'Koncept', variant: 'muted' },
  submitted: { label: 'Ke schválení', variant: 'yellow' },
  approved: { label: 'Schváleno', variant: 'green' },
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  boxSizing: 'border-box', fontSize: '.84rem', width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: '.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2, fontWeight: 500,
}

const sectionTitle: React.CSSProperties = {
  fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 1,
}

function addLineId(line: InvoiceLine): LineWithId {
  return { ...line, _id: crypto.randomUUID() }
}

// ─── SUPPLIER AUTOCOMPLETE ──────────────────────────────────────

function SupplierAutocomplete({ value, onChange, onSelect }: {
  value: string
  onChange: (v: string) => void
  onSelect: (party: { displayName: string; ic: string | null }) => void
}) {
  const [results, setResults] = useState<Array<{ id: string; displayName: string; ic: string | null }>>([])
  const [open, setOpen] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  // FIX 2: cleanup timeout on unmount
  useEffect(() => {
    return () => clearTimeout(timeout.current)
  }, [])

  const search = (q: string) => {
    onChange(q)
    clearTimeout(timeout.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    timeout.current = setTimeout(async () => {
      try {
        const res = await partiesApi.search(q)
        setResults(res)
        setOpen(res.length > 0)
      } catch { setResults([]) }
    }, 300)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input value={value} onChange={e => search(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 200)} style={inputStyle} placeholder="Začněte psát..." />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {results.map(r => (
            <div key={r.id} onMouseDown={() => { onSelect(r); setOpen(false) }}
              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '.84rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 500 }}>{r.displayName}</div>
              {r.ic && <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>IČO: {r.ic}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── LINE ITEMS ─────────────────────────────────────────────────

function LineItemsEditor({ lines, onChange }: {
  lines: LineWithId[]
  onChange: (lines: LineWithId[]) => void
}) {
  const addLine = () => {
    onChange([...lines, { _id: crypto.randomUUID(), description: '', quantity: 1, unit: 'ks', unitPrice: 0, lineTotal: 0, vatRate: 21, vatAmount: 0 }])
  }

  const updateLine = (idx: number, field: keyof InvoiceLine, value: any) => {
    const updated = [...lines]
    ;(updated[idx] as any)[field] = value
    const line = updated[idx]
    line.lineTotal = line.quantity * line.unitPrice
    line.vatAmount = line.lineTotal * (line.vatRate / 100)
    onChange(updated)
  }

  const removeLine = (idx: number) => {
    onChange(lines.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Položky faktury</span>
        <button onClick={addLine} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #1D9E75)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '.78rem' }}>
          <Plus size={13} /> Přidat
        </button>
      </div>

      {lines.length === 0 && (
        <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: '8px 0', fontStyle: 'italic' }}>
          Žádné položky. Klikněte "Přidat" pro přidání řádku.
        </div>
      )}

      {lines.map((line, idx) => (
        <div key={line._id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
          <div>
            {idx === 0 && <label style={labelStyle}>Popis</label>}
            <input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} style={inputStyle} />
          </div>
          <div>
            {idx === 0 && <label style={labelStyle}>Množství</label>}
            <input type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            {idx === 0 && <label style={labelStyle}>Cena/ks</label>}
            <input type="number" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            {idx === 0 && <label style={labelStyle}>DPH %</label>}
            <input type="number" value={line.vatRate} onChange={e => updateLine(idx, 'vatRate', Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            {idx === 0 && <label style={labelStyle}>Celkem</label>}
            <div style={{ ...inputStyle, background: 'transparent', border: 'none', fontWeight: 600 }}>
              {formatKc(line.lineTotal)}
            </div>
          </div>
          <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {lines.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: '.84rem', fontWeight: 600, marginTop: 4, paddingRight: 32 }}>
          Celkem položky: {formatKc(lines.reduce((s, l) => s + l.lineTotal, 0))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────

export default function InvoiceReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: invoice, isLoading } = useInvoice(id)
  const updateMut = useUpdateInvoice()
  const submitMut = useSubmitInvoice()
  const approveMut = useApproveInvoice()
  const returnMut = useReturnInvoiceToDraft()

  const [form, setForm] = useState<Record<string, any>>({})
  const [lines, setLines] = useState<LineWithId[]>([])
  const [dirty, setDirty] = useState(false)
  const [activeField, setActiveField] = useState<string | null>(null)
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1.5)
  const [extractionConfidence, setExtractionConfidence] = useState<string | null>(null)

  // Load extraction data from sessionStorage (set by PdfExtractModal)
  useEffect(() => {
    if (!id) return
    const key = `invoice-extraction-${id}`
    const raw = sessionStorage.getItem(key)
    if (raw) {
      try {
        const { pdfBase64: pdf, confidence } = JSON.parse(raw)
        if (pdf) setPdfBase64(pdf)
        if (confidence) setExtractionConfidence(confidence)
      } catch { /* ignore parse errors */ }
      sessionStorage.removeItem(key)
    }
  }, [id])

  // Populate form when invoice loads
  useEffect(() => {
    if (invoice && !dirty) {
      setForm({
        number: invoice.number,
        type: invoice.type,
        supplierName: invoice.supplierName ?? '',
        supplierIco: invoice.supplierIco ?? '',
        supplierDic: invoice.supplierDic ?? '',
        buyerName: invoice.buyerName ?? '',
        buyerIco: invoice.buyerIco ?? '',
        buyerDic: invoice.buyerDic ?? '',
        description: invoice.description ?? '',
        amountBase: invoice.amountBase,
        vatRate: invoice.vatRate,
        vatAmount: invoice.vatAmount,
        amountTotal: invoice.amountTotal,
        currency: invoice.currency,
        issueDate: invoice.issueDate?.slice(0, 10) ?? '',
        duzp: invoice.duzp?.slice(0, 10) ?? '',
        dueDate: invoice.dueDate?.slice(0, 10) ?? '',
        variableSymbol: invoice.variableSymbol ?? '',
        constantSymbol: invoice.constantSymbol ?? '',
        specificSymbol: invoice.specificSymbol ?? '',
        paymentIban: invoice.paymentIban ?? '',
        note: invoice.note ?? '',
      })
      // FIX 1: add stable IDs to lines
      setLines((invoice.lines ?? []).map(addLineId))
    }
  }, [invoice, dirty])

  const set = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleTextSelected = useCallback((text: string) => {
    if (activeField) {
      set(activeField, text)
      setActiveField(null)
    }
  }, [activeField])

  // FIX 5: recalculate totals when lines change
  const handleLinesChange = (newLines: LineWithId[]) => {
    setLines(newLines)
    setDirty(true)
    const base = newLines.reduce((s, l) =>
      s + (Number(l.quantity) || 1) * (Number(l.unitPrice) || 0), 0)
    const vat = newLines.reduce((s, l) =>
      s + (Number(l.quantity) || 1) * (Number(l.unitPrice) || 0)
        * ((Number(l.vatRate) || 0) / 100), 0)
    setForm(f => ({
      ...f,
      amountBase: base.toFixed(2),
      vatAmount: vat.toFixed(2),
      amountTotal: (base + vat).toFixed(2),
    }))
  }

  const handleSave = async () => {
    if (!id) return
    // Strip _id from lines before sending to API
    const apiLines = lines.map(({ _id, ...rest }) => rest)
    try {
      await updateMut.mutateAsync({
        id,
        dto: {
          number: form.number,
          type: form.type,
          supplierName: form.supplierName || undefined,
          supplierIco: form.supplierIco || undefined,
          supplierDic: form.supplierDic || undefined,
          buyerName: form.buyerName || undefined,
          buyerIco: form.buyerIco || undefined,
          buyerDic: form.buyerDic || undefined,
          description: form.description || undefined,
          amountBase: Number(form.amountBase) || 0,
          vatRate: Number(form.vatRate) || 0,
          vatAmount: Number(form.vatAmount) || 0,
          amountTotal: Number(form.amountTotal) || 0,
          currency: form.currency || 'CZK',
          // FIX 6: no today fallback
          issueDate: form.issueDate || undefined,
          duzp: form.duzp || undefined,
          dueDate: form.dueDate || undefined,
          variableSymbol: form.variableSymbol || undefined,
          constantSymbol: form.constantSymbol || undefined,
          specificSymbol: form.specificSymbol || undefined,
          paymentIban: form.paymentIban || undefined,
          note: form.note || undefined,
          lines: apiLines.length > 0 ? apiLines : undefined,
        },
      })
      setDirty(false)
      toast.success('Doklad uložen')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Uložení selhalo')
    }
  }

  const handleSubmit = async () => {
    if (!id) return
    if (dirty) await handleSave()
    try {
      await submitMut.mutateAsync(id)
      toast.success('Odesláno ke schválení')
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Odeslání selhalo') }
  }

  const handleApprove = async () => {
    if (!id) return
    try {
      await approveMut.mutateAsync(id)
      toast.success('Doklad schválen')
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Schválení selhalo') }
  }

  const handleReturn = async () => {
    if (!id) return
    try {
      await returnMut.mutateAsync({ id })
      toast.success('Vráceno do konceptu')
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Vrácení selhalo') }
  }

  // Load PDF: 1) sessionStorage, 2) invoice.pdfBase64, 3) document attachments
  useEffect(() => {
    if (pdfBase64) return
    if (invoice?.pdfBase64) {
      setPdfBase64(invoice.pdfBase64)
      return
    }
    if (!id) return
    import('../api/finance.api').then(({ financeApi }) => {
      financeApi.invoices.getDocuments(id).then(docs => {
        const pdf = docs.find(d => d.mimeType === 'application/pdf')
        if (pdf) {
          import('../../../core/api/client').then(({ apiClient }) => {
            apiClient.get(`/documents/${pdf.id}/download`, { responseType: 'arraybuffer' }).then(res => {
              const blob = new Blob([res.data as ArrayBuffer], { type: 'application/pdf' })
              const reader = new FileReader()
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  setPdfBase64(reader.result.substring(reader.result.indexOf(',') + 1))
                }
              }
              reader.readAsDataURL(blob)
            }).catch(() => {})
          })
        }
      }).catch(() => {})
    })
  }, [id, pdfBase64, invoice])

  const isDraft = invoice?.approvalStatus === 'draft'
  const isSubmitted = invoice?.approvalStatus === 'submitted'
  const canEdit = isDraft

  const AssignBtn = ({ field }: { field: string }) => {
    if (!pdfBase64 || !canEdit) return null
    const isActive = activeField === field
    return (
      <button onClick={() => setActiveField(isActive ? null : field)} title="Vybrat z PDF"
        style={{ background: isActive ? '#1D9E75' : 'transparent', color: isActive ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', flexShrink: 0 }}>
        <ArrowDownLeft size={11} />
      </button>
    )
  }

  const Field = ({ name, label, type, gridSpan, placeholder }: {
    name: string; label: string; type?: string; gridSpan?: number; placeholder?: string
  }) => (
    <div style={gridSpan ? { gridColumn: `span ${gridSpan}` } : {}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <label style={{ ...labelStyle, margin: 0, flex: 1 }}>{label}</label>
        <AssignBtn field={name} />
      </div>
      <input
        type={type} value={form[name] ?? ''} onChange={e => set(name, e.target.value)}
        disabled={!canEdit} placeholder={placeholder}
        style={{ ...inputStyle, ...(activeField === name ? { borderColor: '#1D9E75', boxShadow: '0 0 0 1px #1D9E75' } : {}) }}
      />
    </div>
  )

  if (isLoading) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Načítám doklad...</div>
  }

  if (!invoice) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Doklad nenalezen</div>
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <button onClick={() => navigate('/finance')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>
            {INVOICE_TYPES[invoice.type] || invoice.type} {invoice.number}
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
            {invoice.supplierName ?? 'Bez dodavatele'} · {formatKc(invoice.amountTotal)}
          </div>
        </div>
        <Badge variant={STATUS_BADGES[invoice.approvalStatus]?.variant as any}>
          {STATUS_BADGES[invoice.approvalStatus]?.label ?? invoice.approvalStatus}
        </Badge>
        {extractionConfidence && (
          <Badge variant={extractionConfidence === 'high' ? 'green' : extractionConfidence === 'medium' ? 'yellow' : 'red'}>
            AI: {extractionConfidence === 'high' ? 'vysoká jistota' : extractionConfidence === 'medium' ? 'střední jistota' : 'nízká jistota'}
          </Badge>
        )}
        {dirty && canEdit && (
          <Button variant="primary" onClick={handleSave} disabled={updateMut.isPending} icon={<Save size={14} />}>
            {updateMut.isPending ? 'Ukládám...' : 'Uložit'}
          </Button>
        )}
        {isDraft && !dirty && <Button onClick={handleSubmit} disabled={submitMut.isPending}>Odeslat ke schválení</Button>}
        {isSubmitted && <Button variant="primary" onClick={handleApprove} disabled={approveMut.isPending}>Schválit</Button>}
        {isSubmitted && <Button onClick={handleReturn} disabled={returnMut.isPending}>Vrátit</Button>}
      </div>

      {/* Split layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left: PDF Viewer */}
        <div style={{ flex: '1 1 50%', minWidth: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--border)', fontSize: '.82rem' }}>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}><ZoomOut size={15} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}><ZoomIn size={15} /></button>
            <button onClick={() => setZoom(1.5)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}><RotateCcw size={14} /></button>
            {activeField && (
              <span style={{ marginLeft: 8, color: 'var(--primary, #1D9E75)', fontWeight: 500 }}>
                Vyberte text pro: {activeField}
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
            {pdfBase64 ? (
              <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Načítám PDF...</div>}>
                {/* FIX 3: safe highlightedTexts + FIX 4: pass scale */}
                <PdfViewer
                  pdfBase64={pdfBase64}
                  onTextSelected={handleTextSelected}
                  highlightedTexts={Object.values(form).filter(v => v !== null && v !== undefined && v !== '').map(v => String(v))}
                  activeFieldLabel={activeField}
                  scale={zoom}
                />
              </Suspense>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '.84rem' }}>
                Žádný PDF dokument
              </div>
            )}
          </div>
        </div>

        {/* Right: Form */}
        <div style={{ flex: '1 1 50%', minWidth: 0, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Number + Type + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <Field name="number" label="Číslo faktury" />
            <div>
              <label style={labelStyle}>Typ</label>
              <select value={form.type ?? 'received'} onChange={e => set('type', e.target.value)} disabled={!canEdit} style={inputStyle}>
                {Object.entries(INVOICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Field name="currency" label="Měna" />
          </div>

          {/* Supplier */}
          <div style={sectionTitle}>Dodavatel</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <label style={{ ...labelStyle, margin: 0, flex: 1 }}>Název</label>
                <AssignBtn field="supplierName" />
              </div>
              {canEdit ? (
                <SupplierAutocomplete
                  value={form.supplierName ?? ''}
                  onChange={v => set('supplierName', v)}
                  onSelect={party => {
                    set('supplierName', party.displayName)
                    if (party.ic) set('supplierIco', party.ic)
                  }}
                />
              ) : (
                <input value={form.supplierName ?? ''} disabled style={inputStyle} />
              )}
            </div>
            <Field name="supplierIco" label="IČO" />
            <Field name="supplierDic" label="DIČ" />
          </div>

          {/* Buyer */}
          <div style={sectionTitle}>Odběratel</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <Field name="buyerName" label="Název" />
            <Field name="buyerIco" label="IČO" />
            <Field name="buyerDic" label="DIČ" />
          </div>

          {/* Amounts */}
          <div style={sectionTitle}>Částky</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <Field name="amountBase" label="Základ" type="number" />
            <Field name="vatRate" label="DPH sazba %" type="number" />
            <Field name="vatAmount" label="DPH" type="number" />
            <div>
              <label style={labelStyle}>Celkem</label>
              <input type="number" value={form.amountTotal ?? ''} onChange={e => set('amountTotal', e.target.value)} disabled={!canEdit}
                style={{ ...inputStyle, fontWeight: 700, fontSize: '.95rem' }} />
            </div>
          </div>

          {/* Dates */}
          <div style={sectionTitle}>Data</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <Field name="issueDate" label="Datum vystavení" type="date" />
            <Field name="duzp" label="DÚZP" type="date" />
            <Field name="dueDate" label="Splatnost" type="date" />
          </div>

          {/* Symbols + IBAN */}
          <div style={sectionTitle}>Platební údaje</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 6 }}>
            <Field name="variableSymbol" label="VS" />
            <Field name="constantSymbol" label="KS" />
            <Field name="specificSymbol" label="SS" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Field name="paymentIban" label="IBAN" placeholder="CZ..." />
          </div>

          {/* Line items — FIX 5: use handleLinesChange */}
          <div style={{ marginBottom: 14 }}>
            <LineItemsEditor lines={lines} onChange={handleLinesChange} />
          </div>

          {/* Description + Note */}
          <div style={sectionTitle}>Ostatní</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <Field name="description" label="Popis" />
            <Field name="note" label="Interní poznámka" />
          </div>
        </div>
      </div>
    </div>
  )
}
