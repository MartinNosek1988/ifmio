import React, { useState, useRef, useCallback, Suspense } from 'react'
import { Upload, FileText, Sparkles, ArrowDownLeft } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Badge, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { apiClient } from '../../../core/api/client'
import { financeApi } from '../api/finance.api'

const PdfViewer = React.lazy(() => import('./PdfViewer'))

type Step = 'upload' | 'extracting' | 'review'
type Confidence = 'high' | 'medium' | 'low'
type FieldConfidence = Record<string, Confidence>

const CONFIDENCE_LABELS: Record<Confidence, { label: string; variant: string }> = {
  high: { label: 'Vysoká jistota — zkontrolujte a uložte', variant: 'green' },
  medium: { label: 'Střední jistota — prosím ověřte data', variant: 'yellow' },
  low: { label: 'Nízká jistota — pečlivě zkontrolujte všechna pole', variant: 'red' },
}

const CONFIDENCE_DOTS: Record<Confidence, string> = {
  high: 'var(--text-muted)',
  medium: '#f59e0b',
  low: '#ef4444',
}

const FIELD_LABELS: Record<string, string> = {
  number: 'Číslo faktury',
  currency: 'Měna',
  supplierName: 'Název dodavatele',
  supplierIco: 'IČO dodavatele',
  supplierDic: 'DIČ dodavatele',
  buyerName: 'Název odběratele',
  buyerIco: 'IČO odběratele',
  buyerDic: 'DIČ odběratele',
  amountBase: 'Základ',
  vatRate: 'DPH sazba',
  vatAmount: 'DPH',
  amountTotal: 'Celkem',
  issueDate: 'Datum vystavení',
  duzp: 'DÚZP',
  dueDate: 'Splatnost',
  variableSymbol: 'VS',
  constantSymbol: 'KS',
  specificSymbol: 'SS',
  paymentIban: 'IBAN',
  description: 'Popis',
}

// Determine per-field confidence from extracted data
function computeFieldConfidence(extracted: Record<string, any>): FieldConfidence {
  const highIfFilled = ['number', 'supplierName', 'amountTotal', 'amountBase']
  const mediumFields = ['variableSymbol', 'paymentIban', 'supplierDic', 'supplierIco', 'buyerDic', 'buyerIco']
  const lowIfEmpty = ['constantSymbol', 'specificSymbol']

  const result: FieldConfidence = {}
  for (const key of Object.keys(FIELD_LABELS)) {
    const val = extracted[key]
    const filled = val !== undefined && val !== null && val !== ''
    if (highIfFilled.includes(key)) {
      result[key] = filled ? 'high' : 'low'
    } else if (lowIfEmpty.includes(key)) {
      result[key] = filled ? 'medium' : 'low'
    } else if (mediumFields.includes(key)) {
      result[key] = filled ? 'medium' : 'low'
    } else {
      result[key] = filled ? 'high' : 'medium'
    }
  }
  return result
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  boxSizing: 'border-box', fontSize: '.84rem', width: '100%',
}

const assignBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#1D9E75' : 'transparent',
  color: active ? '#fff' : 'var(--text-muted)',
  border: 'none', borderRadius: 4, padding: '2px 4px',
  cursor: 'pointer', fontSize: '.78rem', lineHeight: 1, flexShrink: 0,
})

export function PdfExtractModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [confidence, setConfidence] = useState<Confidence>('medium')
  const [form, setForm] = useState<Record<string, any>>({})
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [activeField, setActiveField] = useState<string | null>(null)
  const [fieldConfidence, setFieldConfidence] = useState<FieldConfidence>({})
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [flashField, setFlashField] = useState<string | null>(null)
  const [originalExtracted, setOriginalExtracted] = useState<Record<string, any> | null>(null)

  const set = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setEditedFields(prev => new Set(prev).add(key))
  }

  const extractMut = useMutation({
    mutationFn: (base64: string) => financeApi.invoices.extractPdf(base64),
    onSuccess: (data) => {
      setForm(data.extracted as Record<string, any>)
      setOriginalExtracted({ ...(data.extracted as Record<string, any>) })
      setConfidence(data.confidence)
      setFieldConfidence(computeFieldConfidence(data.extracted as Record<string, any>))
      setStep('review')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Extrakce selhala')
      setStep('upload')
    },
  })

  const createMut = useMutation({
    mutationFn: (dto: any) => apiClient.post('/finance/invoices', dto).then(r => r.data),
    onSuccess: (savedInvoice: any) => {
      toast.success('Faktura uložena')
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })

      // Fire & forget: save extraction pattern for this supplier
      if (originalExtracted && savedInvoice?.id) {
        financeApi.invoices.saveExtractionPattern(savedInvoice.id, originalExtracted)
          .then(res => {
            if (res.saved && res.corrections && res.corrections > 0) {
              toast.success('Vzor pro dodavatele aktualizován')
            }
          })
          .catch(() => {}) // silent failure — pattern is not critical
      }

      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Uložení selhalo'),
  })

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { toast.error('Vyberte PDF soubor'); return }
    if (file.size > 7.5 * 1024 * 1024) { toast.error('PDF je příliš velké (max 7.5 MB)'); return }
    setStep('extracting')
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    setPdfBase64(base64)
    extractMut.mutate(base64)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleSave = () => {
    createMut.mutate({
      number: form.number || `PDF-${Date.now()}`,
      type: 'received',
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
      issueDate: form.issueDate || new Date().toISOString().slice(0, 10),
      duzp: form.duzp || undefined,
      dueDate: form.dueDate || undefined,
      variableSymbol: form.variableSymbol || undefined,
      constantSymbol: form.constantSymbol || undefined,
      specificSymbol: form.specificSymbol || undefined,
      paymentIban: form.paymentIban || undefined,
      currency: form.currency || 'CZK',
    })
  }

  const handleReset = () => {
    setStep('upload'); setForm({}); setPdfBase64(null)
    setActiveField(null); setFieldConfidence({}); setEditedFields(new Set())
    setOriginalExtracted(null)
  }

  const handleTextSelected = useCallback((text: string) => {
    if (activeField) {
      setForm(prev => ({ ...prev, [activeField]: text }))
      setEditedFields(prev => new Set(prev).add(activeField))
      setFlashField(activeField)
      setTimeout(() => setFlashField(null), 1000)
      setActiveField(null)
    }
  }, [activeField])

  const c = CONFIDENCE_LABELS[confidence]
  const isReview = step === 'review'

  // Count low-confidence fields
  const lowConfFields = Object.entries(fieldConfidence)
    .filter(([key, conf]) => conf === 'low' && !editedFields.has(key))

  // Confidence dot for a field
  const confDot = (key: string) => {
    if (editedFields.has(key)) return '#1D9E75' // green = manually edited
    return CONFIDENCE_DOTS[fieldConfidence[key] || 'high']
  }

  const confTooltip = (key: string) => {
    if (editedFields.has(key)) return 'Ručně opraveno'
    const fc = fieldConfidence[key]
    if (fc === 'high') return 'AI jistota: vysoká'
    if (fc === 'medium') return 'AI jistota: střední'
    return 'AI jistota: nízká'
  }

  // Field with assign button + confidence dot
  const Field = ({ name, label, type, style: extraStyle, placeholder }: {
    name: string; label: string; type?: string; style?: React.CSSProperties; placeholder?: string
  }) => {
    const isActive = activeField === name
    const isFlashing = flashField === name
    const borderColor = isActive ? '#1D9E75' : isFlashing ? '#1D9E75' : undefined
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <span
            title={confTooltip(name)}
            style={{
              width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
              background: confDot(name), flexShrink: 0,
            }}
          />
          <label className="form-label" style={{ margin: 0, flex: 1 }}>{label}</label>
          {pdfBase64 && (
            <button
              onClick={() => setActiveField(isActive ? null : name)}
              style={assignBtnStyle(isActive)}
              title="Vyberte text z PDF"
            >
              <ArrowDownLeft size={12} />
            </button>
          )}
        </div>
        <input
          type={type}
          value={form[name] ?? ''}
          onChange={e => set(name, e.target.value)}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            ...extraStyle,
            ...(borderColor ? { borderColor, boxShadow: `0 0 0 1px ${borderColor}` } : {}),
            ...(isFlashing ? { transition: 'border-color 0.3s, box-shadow 0.3s' } : {}),
          }}
        />
      </div>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      extraWide={isReview}
      wide={!isReview}
      title="Import z PDF (AI)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            {isReview && <Button onClick={handleReset}>Zpracovat další PDF</Button>}
            {isReview && (
              <Button variant="primary" onClick={handleSave} disabled={createMut.isPending}>
                {createMut.isPending ? 'Ukládám...' : 'Uložit fakturu'}
              </Button>
            )}
          </div>
        </div>
      }
    >

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--primary, #14b8a6)' : 'var(--border)'}`,
            borderRadius: 10, padding: '40px 16px', textAlign: 'center', cursor: 'pointer',
            background: isDragging ? 'rgba(20,184,166,0.05)' : 'var(--surface-2, var(--surface))',
            transition: 'all 150ms',
          }}
        >
          <Upload size={28} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--text-muted)' }} />
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Přetáhněte PDF fakturu nebo klikněte pro výběr</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
            <FileText size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Podporované formáty: .pdf (max 7.5 MB)
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
            <Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Faktura bude zpracována pomocí AI (Claude Haiku)
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} style={{ display: 'none' }} />
        </div>
      )}

      {/* Step 2: Extracting */}
      {step === 'extracting' && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: 8 }}>Extrahuji data z faktury...</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Zpracovává Claude Haiku AI (~2-5 s)</div>
          <div style={{ marginTop: 16, width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary, #14b8a6)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '16px auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Step 3: Review — split layout */}
      {isReview && (
        <div style={{
          display: 'flex', gap: 16,
          flexDirection: window.innerWidth <= 900 ? 'column' : 'row',
          minHeight: 0,
        }}>
          {/* Left: PDF Viewer */}
          {pdfBase64 && (
            <div style={{
              flex: '1 1 50%', minWidth: 0,
              maxHeight: window.innerWidth <= 900 ? 300 : 600,
              display: 'flex', flexDirection: 'column',
            }}>
              <Suspense fallback={
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Načítám PDF viewer...
                </div>
              }>
                <PdfViewer
                  pdfBase64={pdfBase64}
                  onTextSelected={handleTextSelected}
                  highlightedTexts={Object.values(form).filter(Boolean) as string[]}
                  activeFieldLabel={activeField ? FIELD_LABELS[activeField] || activeField : null}
                />
              </Suspense>
              {!activeField && (
                <div style={{
                  textAlign: 'center', fontSize: '.78rem', color: 'var(--text-muted)',
                  marginTop: 6, fontStyle: 'italic',
                }}>
                  Klikněte na tlačítko u pole a poté vyberte text v PDF
                </div>
              )}
            </div>
          )}

          {/* Right: Form */}
          <div style={{
            flex: '1 1 50%', minWidth: 0, overflowY: 'auto',
            maxHeight: window.innerWidth <= 900 ? undefined : 600,
          }}>
            {/* Confidence banner */}
            <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 6, background: 'var(--surface-2, var(--surface))', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} />
              <Badge variant={c.variant as any}>{c.label}</Badge>
            </div>

            {/* Low confidence warning */}
            {lowConfFields.length > 0 && (
              <div style={{
                marginBottom: 12, padding: '6px 12px', borderRadius: 6,
                background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '.82rem', color: '#b45309',
              }}>
                {lowConfFields.length} {lowConfFields.length === 1 ? 'pole má' : 'polí má'} nízkou jistotu — prosím zkontrolujte
              </div>
            )}

            {/* Number + Currency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field name="number" label="Číslo faktury *" />
              <Field name="currency" label="Měna" />
            </div>

            {/* Supplier */}
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Dodavatel</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field name="supplierName" label="Název" />
              <Field name="supplierIco" label="IČO" />
              <Field name="supplierDic" label="DIČ" />
            </div>

            {/* Buyer */}
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Odběratel</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field name="buyerName" label="Název" />
              <Field name="buyerIco" label="IČO" />
              <Field name="buyerDic" label="DIČ" />
            </div>

            {/* Amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field name="amountBase" label="Základ" type="number" />
              <Field name="vatRate" label="DPH sazba %" type="number" />
              <Field name="vatAmount" label="DPH" type="number" />
              <Field name="amountTotal" label="Celkem" type="number" style={{ fontWeight: 600 }} />
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field name="issueDate" label="Datum vystavení" type="date" />
              <Field name="duzp" label="DÚZP" type="date" />
              <Field name="dueDate" label="Splatnost" type="date" />
            </div>

            {/* Symbols + IBAN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 12, marginBottom: 12 }}>
              <Field name="variableSymbol" label="VS" />
              <Field name="constantSymbol" label="KS" />
              <Field name="specificSymbol" label="SS" />
              <Field name="paymentIban" label="IBAN" placeholder="CZ..." />
            </div>

            {/* Description */}
            <Field name="description" label="Popis" />
          </div>
        </div>
      )}
    </Modal>
  )
}
