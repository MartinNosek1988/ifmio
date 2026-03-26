import { useState, useRef } from 'react'
import { Upload, FileText, Sparkles } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Badge, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { apiClient } from '../../../core/api/client'
import { financeApi } from '../api/finance.api'

type Step = 'upload' | 'extracting' | 'review'
type Confidence = 'high' | 'medium' | 'low'

const CONFIDENCE_LABELS: Record<Confidence, { label: string; variant: string }> = {
  high: { label: 'Vysoká jistota — zkontrolujte a uložte', variant: 'green' },
  medium: { label: 'Střední jistota — prosím ověřte data', variant: 'yellow' },
  low: { label: 'Nízká jistota — pečlivě zkontrolujte všechna pole', variant: 'red' },
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  boxSizing: 'border-box', fontSize: '.84rem', width: '100%',
}

export function PdfExtractModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [confidence, setConfidence] = useState<Confidence>('medium')
  const [form, setForm] = useState<Record<string, any>>({})
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  const extractMut = useMutation({
    mutationFn: (base64: string) => financeApi.invoices.extractPdf(base64),
    onSuccess: (data) => {
      setForm(data.extracted)
      setConfidence(data.confidence)
      setStep('review')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Extrakce selhala')
      setStep('upload')
    },
  })

  const createMut = useMutation({
    mutationFn: (dto: any) => apiClient.post('/finance/invoices', dto).then(r => r.data),
    onSuccess: () => {
      toast.success('Faktura uložena')
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
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
  }

  const c = CONFIDENCE_LABELS[confidence]

  return (
    <Modal open onClose={onClose} wide title="Import z PDF (AI)" footer={
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step === 'review' && <Button onClick={handleReset}>Zpracovat další PDF</Button>}
          {step === 'review' && (
            <Button variant="primary" onClick={handleSave} disabled={createMut.isPending}>
              {createMut.isPending ? 'Ukládám...' : 'Uložit fakturu'}
            </Button>
          )}
        </div>
      </div>
    }>

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

      {/* Step 3: Review */}
      {step === 'review' && (
        <div>
          <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 6, background: 'var(--surface-2, var(--surface))', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} />
            <Badge variant={c.variant as any}>{c.label}</Badge>
          </div>

          {/* Number + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Číslo faktury *</label>
              <input value={form.number ?? ''} onChange={e => set('number', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Měna</label>
              <input value={form.currency ?? 'CZK'} onChange={e => set('currency', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Supplier */}
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Dodavatel</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Název</label>
              <input value={form.supplierName ?? ''} onChange={e => set('supplierName', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">IČO</label>
              <input value={form.supplierIco ?? ''} onChange={e => set('supplierIco', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">DIČ</label>
              <input value={form.supplierDic ?? ''} onChange={e => set('supplierDic', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Buyer */}
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Odběratel</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Název</label>
              <input value={form.buyerName ?? ''} onChange={e => set('buyerName', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">IČO</label>
              <input value={form.buyerIco ?? ''} onChange={e => set('buyerIco', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">DIČ</label>
              <input value={form.buyerDic ?? ''} onChange={e => set('buyerDic', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Amounts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Základ</label>
              <input type="number" value={form.amountBase ?? ''} onChange={e => set('amountBase', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">DPH sazba %</label>
              <input type="number" value={form.vatRate ?? ''} onChange={e => set('vatRate', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">DPH</label>
              <input type="number" value={form.vatAmount ?? ''} onChange={e => set('vatAmount', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Celkem</label>
              <input type="number" value={form.amountTotal ?? ''} onChange={e => set('amountTotal', e.target.value)} style={{ ...inputStyle, fontWeight: 600 }} />
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Datum vystavení</label>
              <input type="date" value={form.issueDate ?? ''} onChange={e => set('issueDate', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">DÚZP</label>
              <input type="date" value={form.duzp ?? ''} onChange={e => set('duzp', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Splatnost</label>
              <input type="date" value={form.dueDate ?? ''} onChange={e => set('dueDate', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Symbols + IBAN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">VS</label>
              <input value={form.variableSymbol ?? ''} onChange={e => set('variableSymbol', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">KS</label>
              <input value={form.constantSymbol ?? ''} onChange={e => set('constantSymbol', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">SS</label>
              <input value={form.specificSymbol ?? ''} onChange={e => set('specificSymbol', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">IBAN</label>
              <input value={form.paymentIban ?? ''} onChange={e => set('paymentIban', e.target.value)} style={inputStyle} placeholder="CZ..." />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Popis</label>
            <input value={form.description ?? ''} onChange={e => set('description', e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}
    </Modal>
  )
}
