import { useState, useRef } from 'react'
import { Upload, FileText, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { apiClient } from '../../../core/api/client'
import { financeApi } from '../api/finance.api'

export function PdfExtractModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfBase64Ref = useRef<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [step, setStep] = useState<'upload' | 'extracting'>('upload')

  const extractMut = useMutation({
    mutationFn: (base64: string) => financeApi.invoices.extractPdf(base64),
    onSuccess: async (data) => {
      const extracted = data.extracted as Record<string, any>

      // Create draft invoice immediately
      try {
        const savedInvoice = await apiClient.post('/finance/invoices', {
          number: extracted.number || `PDF-${Date.now()}`,
          type: 'received',
          supplierName: extracted.supplierName || undefined,
          supplierIco: extracted.supplierIco || undefined,
          supplierDic: extracted.supplierDic || undefined,
          buyerName: extracted.buyerName || undefined,
          buyerIco: extracted.buyerIco || undefined,
          buyerDic: extracted.buyerDic || undefined,
          description: extracted.description || undefined,
          amountBase: Number(extracted.amountBase) || 0,
          vatRate: Number(extracted.vatRate) || 0,
          vatAmount: Number(extracted.vatAmount) || 0,
          amountTotal: Number(extracted.amountTotal) || 0,
          issueDate: extracted.issueDate || new Date().toISOString().slice(0, 10),
          duzp: extracted.duzp || undefined,
          dueDate: extracted.dueDate || undefined,
          variableSymbol: extracted.variableSymbol || undefined,
          constantSymbol: extracted.constantSymbol || undefined,
          specificSymbol: extracted.specificSymbol || undefined,
          paymentIban: extracted.paymentIban || undefined,
          currency: extracted.currency || 'CZK',
          lines: extracted.lines ?? [],
          pdfBase64: pdfBase64Ref.current || undefined,
        }).then(r => r.data)

        const invoiceId = savedInvoice.id
        qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })

        // Store extraction data + PDF in sessionStorage for review page
        sessionStorage.setItem(
          `invoice-extraction-${invoiceId}`,
          JSON.stringify({
            originalExtracted: extracted,
            confidence: data.confidence,
            pdfBase64: pdfBase64Ref.current,
          }),
        )

        // Fire & forget: save extraction pattern + training data
        financeApi.invoices.saveExtractionPattern(invoiceId, extracted, pdfBase64Ref.current ?? undefined).catch(() => {})

        toast.success('Faktura vytvořena — otevírám detail')
        onClose()
        navigate(`/finance/invoices/${invoiceId}/review`)
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Vytvoření faktury selhalo')
        setStep('upload')
      }
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Extrakce selhala')
      setStep('upload')
    },
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
    pdfBase64Ref.current = base64
    extractMut.mutate(base64)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <Modal open onClose={onClose} wide title="Import z PDF (AI)" footer={
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button onClick={onClose}>Zrušit</Button>
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
            AI extrahuje data a otevře detail faktury pro kontrolu
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} style={{ display: 'none' }} />
        </div>
      )}

      {/* Step 2: Extracting + creating draft */}
      {step === 'extracting' && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: 8 }}>Extrahuji data z faktury...</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Zpracovává Claude Haiku AI (~2-5 s)</div>
          <div style={{ marginTop: 16, width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary, #14b8a6)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '16px auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
    </Modal>
  )
}
