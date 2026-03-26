import { useState, useRef, useCallback } from 'react'
import { Upload, CheckCircle2, XCircle, AlertTriangle, FileText, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal, Button, Badge } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { apiClient } from '../../../core/api/client'

interface FilePair {
  isdoc: File
  pdf: File | null
}

interface ImportResult {
  isdocFileName: string
  success: boolean
  invoiceId?: string
  number?: string
  error?: string
}

export function IsdocImportModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pairs, setPairs] = useState<FilePair[]>([])
  const [unpairedPdfs, setUnpairedPdfs] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[] | null>(null)

  const processFiles = useCallback((files: File[]) => {
    const isdocFiles = files.filter(f => f.name.toLowerCase().endsWith('.isdoc') || f.name.toLowerCase().endsWith('.isdocx'))
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'))

    const newPairs = isdocFiles.map(isdoc => {
      const basename = isdoc.name.replace(/\.isdocx?$/i, '').toLowerCase()
      const matchedPdf = pdfFiles.find(pdf => pdf.name.replace(/\.pdf$/i, '').toLowerCase() === basename)
      return { isdoc, pdf: matchedPdf ?? null }
    })

    const usedPdfs = new Set(newPairs.filter(p => p.pdf).map(p => p.pdf!.name))
    const orphanPdfs = pdfFiles.filter(pdf => !usedPdfs.has(pdf.name))

    setPairs(prev => [...prev, ...newPairs])
    setUnpairedPdfs(prev => [...prev, ...orphanPdfs])
    setResults(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 50) { toast.error('Maximálně 50 souborů najednou'); return }
    processFiles(files)
  }, [processFiles, toast])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 50) { toast.error('Maximálně 50 souborů najednou'); return }
    processFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [processFiles, toast])

  const removePair = (idx: number) => {
    setPairs(prev => prev.filter((_, i) => i !== idx))
  }

  const handleImport = async () => {
    if (pairs.length === 0) return
    setImporting(true)

    try {
      const invoices = await Promise.all(pairs.map(async ({ isdoc, pdf }) => {
        const xmlContent = await isdoc.text()
        let pdfBase64: string | undefined
        let pdfFileName: string | undefined

        if (pdf) {
          const buffer = await pdf.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
          pdfBase64 = btoa(binary)
          pdfFileName = pdf.name
        }

        return { xmlContent, pdfBase64, pdfFileName, isdocFileName: isdoc.name }
      }))

      const res = await apiClient.post('/finance/invoices/import-isdoc-bulk', { invoices })
      setResults(res.data.results)

      if (res.data.created > 0) {
        toast.success(`Importováno ${res.data.created} faktur`)
        qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      }
      if (res.data.failed > 0) {
        toast.error(`${res.data.failed} faktur se nepodařilo importovat`)
      }
    } catch {
      toast.error('Import selhal')
    } finally {
      setImporting(false)
    }
  }

  const resetAll = () => {
    setPairs([])
    setUnpairedPdfs([])
    setResults(null)
  }

  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`

  return (
    <Modal open onClose={onClose} wide title="Import faktur (ISDOC + PDF)" footer={
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          {results && <Button onClick={resetAll}>Importovat další</Button>}
          {!results && pairs.length > 0 && (
            <Button variant="primary" onClick={handleImport} disabled={importing}>
              {importing ? 'Importuji...' : `Importovat ${pairs.length} ${pairs.length === 1 ? 'fakturu' : pairs.length < 5 ? 'faktury' : 'faktur'}`}
            </Button>
          )}
        </div>
      </div>
    }>

      {/* Results view */}
      {results ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--surface-2, var(--surface))', fontSize: '.85rem' }}>
              {r.success ? <CheckCircle2 size={16} color="#22c55e" /> : <XCircle size={16} color="#ef4444" />}
              <span style={{ fontWeight: 500, flex: 1 }}>{r.isdocFileName}</span>
              {r.success ? (
                <span style={{ color: 'var(--text-muted)' }}>č. {r.number}</span>
              ) : (
                <span style={{ color: '#ef4444', fontSize: '.82rem' }}>{r.error}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--primary, #14b8a6)' : 'var(--border)'}`,
              borderRadius: 10,
              padding: '32px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(20,184,166,0.05)' : 'var(--surface-2, var(--surface))',
              transition: 'all 150ms',
              marginBottom: 16,
            }}
          >
            <Upload size={28} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--text-muted)' }} />
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Přetáhněte soubory sem nebo klikněte pro výběr</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
              <FileText size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Podporované formáty: .isdoc, .pdf — vyberte libovolný počet souborů najednou
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".isdoc,.isdocx,.pdf" onChange={handleFileInput} style={{ display: 'none' }} />
          </div>

          {/* Paired files */}
          {pairs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Spárované faktury ({pairs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pairs.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--surface-2, var(--surface))', fontSize: '.84rem' }}>
                    {p.pdf ? <CheckCircle2 size={14} color="#22c55e" /> : <AlertTriangle size={14} color="#eab308" />}
                    <span style={{ fontWeight: 500 }}>{p.isdoc.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>({formatSize(p.isdoc.size)})</span>
                    {p.pdf ? (
                      <>
                        <span style={{ color: 'var(--text-muted)' }}>+</span>
                        <Badge variant="blue">{p.pdf.name}</Badge>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '.8rem' }}>(bez PDF)</span>
                    )}
                    <span style={{ flex: 1 }} />
                    <button onClick={() => removePair(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unpaired PDFs */}
          {unpairedPdfs.length > 0 && (
            <div>
              <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Nepárované PDF (budou ignorovány)
              </div>
              {unpairedPdfs.map((pdf, i) => (
                <div key={i} style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: '2px 0' }}>
                  {pdf.name} — nenalezen odpovídající ISDOC
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
