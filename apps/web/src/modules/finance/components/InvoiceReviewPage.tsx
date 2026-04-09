import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, ArrowDownLeft, Trash2 } from 'lucide-react'
import { Badge, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useInvoice, useUpdateInvoice, useSubmitInvoice, useApproveInvoice, useReturnInvoiceToDraft } from '../api/finance.queries'
import { formatKc } from '../../../shared/utils/format'
import { partiesApi } from '../../parties/api/parties.api'
import type { InvoiceLine } from '../api/finance.api'
import { GenericChatter } from '../../../shared/components/chatter/GenericChatter'

const PdfViewer = React.lazy(() => import('./PdfViewer'))

// ─── CONSTANTS ──────────────────────────────────────────────────

type LineWithId = InvoiceLine & { _id: string; type?: 'item' | 'section' | 'note'; account?: string; analytic?: string; fulfillmentCode?: string }

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
  const qty = safeNum(line.quantity)
  const price = safeNum(line.unitPrice)
  const rate = safeNum(line.vatRate)
  const lineTotal = line.lineTotal != null ? safeNum(line.lineTotal) : qty * price
  const vatAmount = line.vatAmount != null ? safeNum(line.vatAmount) : lineTotal * (rate / 100)
  return { ...line, _id: crypto.randomUUID(), lineTotal, vatAmount }
}

const safeNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

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

// ─── LINE ITEMS (Odoo-style) ────────────────────────────────────

const VAT_RATES = [0, 12, 15, 21]

function LineItemsEditor({ lines, onChange, rounding = 0 }: {
  lines: LineWithId[]
  onChange: (lines: LineWithId[]) => void
  rounding?: number
}) {
  const [vatMenu, setVatMenu] = useState<number | null>(null)

  useEffect(() => {
    const handler = () => setVatMenu(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addItem = () => onChange([...lines, { _id: crypto.randomUUID(), type: 'item', description: '', quantity: 1, unit: 'ks', unitPrice: 0, lineTotal: 0, vatRate: 21, vatAmount: 0 }])
  const addSection = () => onChange([...lines, { _id: crypto.randomUUID(), type: 'section', description: '', quantity: 0, unit: '', unitPrice: 0, lineTotal: 0, vatRate: 0, vatAmount: 0 }])
  const addNote = () => onChange([...lines, { _id: crypto.randomUUID(), type: 'note', description: '', quantity: 0, unit: '', unitPrice: 0, lineTotal: 0, vatRate: 0, vatAmount: 0 }])

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines]
    ;(updated[idx] as any)[field] = value
    const line = updated[idx]
    if (line.type !== 'section' && line.type !== 'note') {
      line.quantity = safeNum(line.quantity)
      line.unitPrice = safeNum(line.unitPrice)
      line.vatRate = safeNum(line.vatRate)
      line.lineTotal = line.quantity * line.unitPrice
      line.vatAmount = line.lineTotal * (line.vatRate / 100)
    }
    onChange(updated)
  }

  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx))

  const items = lines.filter(l => l.type !== 'section' && l.type !== 'note')
  const vatGroups = items.reduce<Record<number, { base: number; vat: number }>>((acc, l) => {
    const rate = safeNum(l.vatRate)
    if (!acc[rate]) acc[rate] = { base: 0, vat: 0 }
    acc[rate].base += safeNum(l.lineTotal)
    acc[rate].vat += safeNum(l.vatAmount)
    return acc
  }, {})
  const totalBase = items.reduce((s, l) => s + safeNum(l.lineTotal), 0)
  const totalVat = items.reduce((s, l) => s + safeNum(l.vatAmount), 0)

  return (
    <div>
      {/* Header row */}
      {lines.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 0.8fr 1fr 55px 1fr 0.8fr 1fr auto', gap: 4, marginBottom: 4 }}>
          <label style={labelStyle}>Popis</label>
          <label style={labelStyle}>Účet</label>
          <label style={labelStyle}>Množství</label>
          <label style={labelStyle}>Cena/ks</label>
          <label style={labelStyle}>Daně</label>
          <label style={{ ...labelStyle, textAlign: 'right' }}>Základ</label>
          <label style={{ ...labelStyle, textAlign: 'right' }}>DPH</label>
          <label style={{ ...labelStyle, textAlign: 'right' }}>Celkem</label>
          <div />
        </div>
      )}

      {lines.map((line, idx) => {
        if (line.type === 'section') {
          return (
            <div key={line._id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Název sekce" style={{ ...inputStyle, fontWeight: 700, flex: 1 }} />
              <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}><Trash2 size={13} /></button>
            </div>
          )
        }
        if (line.type === 'note') {
          return (
            <div key={line._id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Poznámka..." style={{ ...inputStyle, flex: 1, fontStyle: 'italic', color: 'var(--text-muted)' }} />
              <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}><Trash2 size={13} /></button>
            </div>
          )
        }
        return (
          <div key={line._id} style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 0.8fr 1fr 55px 1fr 0.8fr 1fr auto', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} style={inputStyle} />
            <input value={line.account ?? ''} onChange={e => updateLine(idx, 'account', e.target.value)} placeholder="518000" style={{ ...inputStyle, fontSize: '.78rem' }} />
            <input type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} style={inputStyle} />
            <input type="number" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))} style={inputStyle} />
            <div style={{ position: 'relative' }} onMouseDown={e => e.stopPropagation()}>
              <button onClick={() => setVatMenu(vatMenu === idx ? null : idx)} style={{ padding: '2px 8px', borderRadius: 12, background: line.vatRate > 0 ? '#dbeafe' : '#f3f4f6', color: line.vatRate > 0 ? '#1e40af' : '#6b7280', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                {safeNum(line.vatRate)}%
              </button>
              {vatMenu === idx && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: 70 }}>
                  {VAT_RATES.map(rate => (
                    <div key={rate} onClick={() => { updateLine(idx, 'vatRate', rate); setVatMenu(null) }} style={{ padding: '5px 12px', cursor: 'pointer', fontSize: 13, background: rate === safeNum(line.vatRate) ? '#eff6ff' : '#fff' }}>{rate}%</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: '.82rem', color: 'var(--text-muted)' }}>{formatKc(safeNum(line.lineTotal))}</div>
            <div style={{ textAlign: 'right', fontSize: '.82rem', color: 'var(--text-muted)' }}>{formatKc(safeNum(line.vatAmount))}</div>
            <div style={{ textAlign: 'right', fontSize: '.84rem', fontWeight: 600 }}>{formatKc(safeNum(line.lineTotal) + safeNum(line.vatAmount))}</div>
            <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}><Trash2 size={13} /></button>
          </div>
        )
      })}

      {/* Action row */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '.82rem' }}>
        <button onClick={addItem} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #1D9E75)', fontWeight: 500 }}>+ Přidat položku</button>
        <button onClick={addSection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Přidat sekci</button>
        <button onClick={addNote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Přidat poznámku</button>
      </div>

      {/* VAT summary */}
      {items.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '.84rem', minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Základ bez DPH</span>
              <strong>{formatKc(totalBase)}</strong>
            </div>
            {Object.entries(vatGroups).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, { vat }]) => Number(rate) > 0 && (
              <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>DPH {rate}%</span>
                <strong>{formatKc(vat)}</strong>
              </div>
            ))}
            {Math.abs(rounding) > 0.001 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '.82rem', color: 'var(--text-muted)' }}>
                <span>Zaokrouhlení</span>
                <span>{rounding >= 0 ? '+' : ''}{rounding.toFixed(2).replace('.', ',')} Kč</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)', fontWeight: 700 }}>
              <span>Celkem</span>
              <span>{formatKc(totalBase + totalVat + rounding)}</span>
            </div>
          </div>
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
  const [zoomMode, setZoomMode] = useState<number | 'auto' | 'page' | 'width'>('width')
  const [lineTab, setLineTab] = useState<'lines' | 'accounting' | 'other'>('lines')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
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
        rounding: invoice.rounding ?? 0,
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

  // Recalculate totals when lines change (section/note excluded)
  const handleLinesChange = (newLines: LineWithId[]) => {
    setLines(newLines)
    setDirty(true)
    const itemLines = newLines.filter(l => !l.type || l.type === 'item')
    const base = itemLines.reduce((s, l) => s + safeNum(l.lineTotal), 0)
    const vat = itemLines.reduce((s, l) => s + safeNum(l.vatAmount), 0)
    setForm(f => ({
      ...f,
      amountBase: base.toFixed(2),
      vatAmount: vat.toFixed(2),
      amountTotal: (base + vat + safeNum(f.rounding)).toFixed(2),
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
  }, [id, pdfBase64, invoice?.pdfBase64])

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

      {/* Invoice lifecycle stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '0', padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {([
          { label: 'Vytvořeno', done: true, date: invoice.createdAt },
          { label: 'Odesláno', done: !!invoice.submittedAt, date: invoice.submittedAt },
          { label: 'Schváleno', done: invoice.approvalStatus === 'approved', date: invoice.approvedAt },
          { label: 'Uhrazeno', done: invoice.isPaid, date: invoice.paymentDate },
        ] as const).map((stage, i, arr) => (
          <React.Fragment key={stage.label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: stage.done ? 'var(--success, #22c55e)' : 'var(--surface-2, #f3f4f6)',
                color: stage.done ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
              }}>
                {stage.done ? '\u2713' : i + 1}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, fontWeight: stage.done ? 500 : 400, color: stage.done ? 'var(--text)' : 'var(--text-muted)' }}>
                {stage.label}
              </div>
              {stage.date && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {new Date(stage.date).toLocaleDateString('cs-CZ')}
                </div>
              )}
            </div>
            {i < arr.length - 1 && (
              <div style={{ flex: 1, height: 2, background: arr[i + 1].done ? 'var(--success, #22c55e)' : 'var(--border)', marginBottom: 28 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Split layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: PDF Viewer */}
        <div style={{ flex: '0 0 52%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Toolbar: page nav + zoom dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--border)', fontSize: '.82rem', flexShrink: 0 }}>
            {totalPages > 1 && (<>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}><ArrowLeft size={14} /></button>
              <span>{currentPage} z {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}><ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} /></button>
            </>)}
            <div style={{ flex: 1 }} />
            {activeField && (
              <span style={{ color: 'var(--primary, #1D9E75)', fontWeight: 500, fontSize: '.78rem' }}>
                Vyberte text pro: {activeField}
              </span>
            )}
            <select
              value={String(zoomMode)}
              onChange={e => { const v = e.target.value; setZoomMode(v === 'auto' || v === 'page' || v === 'width' ? v : parseFloat(v)); }}
              style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <option value="width">Podle šířky</option>
              <option value="auto">Automatická velikost</option>
              <option value="page">Podle stránky</option>
              <option value="0.5">50 %</option>
              <option value="0.75">75 %</option>
              <option value="1">100 %</option>
              <option value="1.25">125 %</option>
              <option value="1.5">150 %</option>
              <option value="2">200 %</option>
              <option value="3">300 %</option>
            </select>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: '#f0f0f0' }}>
            {pdfBase64 ? (
              <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Načítám PDF...</div>}>
                {/* FIX 3: safe highlightedTexts + FIX 4: pass scale */}
                <PdfViewer
                  pdfBase64={pdfBase64}
                  onTextSelected={handleTextSelected}
                  highlightedTexts={Object.values(form).filter(v => v !== null && v !== undefined && v !== '').map(v => String(v))}
                  activeFieldLabel={activeField}
                  zoomMode={zoomMode}
                  page={currentPage}
                  onPageChange={(p, t) => { setCurrentPage(p); setTotalPages(t) }}
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
        <div style={{ flex: '0 0 48%', overflowY: 'auto', padding: '16px 20px' }}>
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

          {/* Tabs: Položky / Účetní / Další */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
            {([['lines', 'Položky faktury'], ['accounting', 'Účetní položky'], ['other', 'Další informace']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setLineTab(key)} style={{
                padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '.84rem', fontWeight: 500, background: 'none',
                color: lineTab === key ? 'var(--primary, #1D9E75)' : 'var(--text-muted)',
                borderBottom: lineTab === key ? '2px solid var(--primary, #1D9E75)' : '2px solid transparent',
              }}>{label}</button>
            ))}
          </div>

          {lineTab === 'lines' && (
            <div style={{ marginBottom: 14 }}>
              <LineItemsEditor lines={lines} onChange={handleLinesChange} rounding={safeNum(form.rounding)} />
            </div>
          )}

          {lineTab === 'accounting' && (
            <div style={{ padding: '16px 0', fontSize: '.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Funkce účetních položek bude brzy k dispozici.
            </div>
          )}

          {lineTab === 'other' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <Field name="description" label="Popis" />
              <Field name="note" label="Interní poznámka" />
            </div>
          )}

          {/* Chatter */}
          {id && <GenericChatter entityType="Invoice" entityId={id} />}
        </div>
      </div>
    </div>
  )
}
