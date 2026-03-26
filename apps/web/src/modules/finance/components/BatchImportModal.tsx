import { useState, useRef } from 'react'
import { Upload, FileText, Clock, CheckCircle } from 'lucide-react'
import { Modal, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useCreateBatchExtract } from '../api/finance.queries'

type Step = 'upload' | 'submitting' | 'done'

const USD_CZK_RATE = 23.0
const EST_TOKENS_PER_PDF = 1500
const HAIKU_INPUT_PRICE = 1.0 // per MTok
const BATCH_DISCOUNT = 0.5

interface PdfFile {
  name: string
  base64: string
  size: number
}

export function BatchImportModal({ onClose, onShowQueue }: { onClose: () => void; onShowQueue?: () => void }) {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<PdfFile[]>([])
  const [result, setResult] = useState<{ batchId: string; itemCount: number; estimatedCostCzk: number } | null>(null)
  const createMut = useCreateBatchExtract()

  const addFiles = async (fileList: FileList) => {
    const newFiles: PdfFile[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (!file.name.toLowerCase().endsWith('.pdf')) continue
      if (file.size > 7.5 * 1024 * 1024) {
        toast.error(`${file.name}: příliš velké (max 7.5 MB)`)
        continue
      }
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
      newFiles.push({ name: file.name, base64: btoa(binary), size: file.size })
    }
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const estimatedCostCzk = files.length * EST_TOKENS_PER_PDF * (HAIKU_INPUT_PRICE / 1e6) * BATCH_DISCOUNT * USD_CZK_RATE
  const normalCostCzk = files.length * EST_TOKENS_PER_PDF * (HAIKU_INPUT_PRICE / 1e6) * USD_CZK_RATE

  const handleSubmit = async () => {
    if (files.length === 0) return
    setStep('submitting')
    try {
      const res = await createMut.mutateAsync(
        files.map(f => ({ pdfBase64: f.base64, fileName: f.name })),
      )
      setResult({ batchId: res.batchId, itemCount: res.itemCount, estimatedCostCzk: res.estimatedCostCzk })
      setStep('done')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Odeslání selhalo')
      setStep('upload')
    }
  }

  return (
    <Modal open onClose={onClose} wide title="Dávkový import faktur (-50% nákladů)" footer={
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button onClick={onClose}>{step === 'done' ? 'Zavřít' : 'Zrušit'}</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step === 'done' && onShowQueue && (
            <Button onClick={() => { onClose(); onShowQueue(); }}>Zobrazit frontu</Button>
          )}
          {step === 'upload' && (
            <Button variant="primary" onClick={handleSubmit} disabled={files.length === 0}>
              Spustit dávkové zpracování ({files.length})
            </Button>
          )}
        </div>
      </div>
    }>
      {step === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--primary, #14b8a6)' : 'var(--border)'}`,
              borderRadius: 10, padding: '32px 16px', textAlign: 'center', cursor: 'pointer',
              background: isDragging ? 'rgba(20,184,166,0.05)' : 'var(--surface-2, var(--surface))',
              transition: 'all 150ms', marginBottom: 16,
            }}
          >
            <Upload size={28} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--text-muted)' }} />
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Přetáhněte PDF faktury nebo klikněte pro výběr</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Více souborů najednou</div>
            <input
              ref={fileInputRef} type="file" accept=".pdf" multiple
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
              style={{ display: 'none' }}
            />
          </div>

          {files.length > 0 && (
            <>
              <div style={{ fontSize: '.84rem', fontWeight: 500, marginBottom: 8 }}>
                Přidáno: {files.length} PDF {files.length === 1 ? 'soubor' : files.length < 5 ? 'soubory' : 'souborů'}
              </div>

              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '.82rem', borderBottom: '1px solid var(--border)' }}>
                    <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '.78rem' }}>Odebrat</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', background: 'var(--surface-2, var(--surface))', borderRadius: 8, fontSize: '.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Odhadovaná cena:</span>
                  <strong style={{ color: 'var(--primary, #1D9E75)' }}>~{estimatedCostCzk.toFixed(2)} Kč</strong>
                  <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>~{normalCostCzk.toFixed(2)} Kč</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                  <Clock size={13} />
                  <span>Zpracování do 24 hodin</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'submitting' && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: 8 }}>
            Odesílám {files.length} faktur na zpracování...
          </div>
          <div style={{ marginTop: 16, width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary, #14b8a6)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '16px auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {step === 'done' && result && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <CheckCircle size={48} style={{ color: 'var(--primary, #1D9E75)', margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: 8 }}>
            {result.itemCount} faktur odesláno ke zpracování
          </div>
          <div style={{ fontSize: '.84rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Batch ID: {result.batchId.slice(0, 12)}...
          </div>
          <div style={{ fontSize: '.84rem', color: 'var(--text-muted)' }}>
            Výsledky budou dostupné do 24 hodin
          </div>
          <div style={{ fontSize: '.84rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Odhadovaná cena: {result.estimatedCostCzk.toFixed(2)} Kč
          </div>
        </div>
      )}
    </Modal>
  )
}
