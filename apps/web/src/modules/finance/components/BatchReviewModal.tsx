import React, { useState, Suspense } from 'react'
import { ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react'
import { Modal, Badge, Button } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useBatchDetail, useSaveBatchInvoices } from '../api/finance.queries'
import { financeApi } from '../api/finance.api'

const PdfViewer = React.lazy(() => import('./PdfViewer'))

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  boxSizing: 'border-box', fontSize: '.84rem', width: '100%',
}

const FIELD_LABELS: Record<string, string> = {
  number: 'Číslo', supplierName: 'Dodavatel', supplierIco: 'IČO', supplierDic: 'DIČ',
  buyerName: 'Odběratel', amountBase: 'Základ', vatRate: 'DPH %', vatAmount: 'DPH',
  amountTotal: 'Celkem', issueDate: 'Vystavení', duzp: 'DÚZP', dueDate: 'Splatnost',
  variableSymbol: 'VS', constantSymbol: 'KS', specificSymbol: 'SS', paymentIban: 'IBAN',
  currency: 'Měna', description: 'Popis',
}

type BatchItem = {
  id: string
  fileName: string | null
  status: string
  extractedData: Record<string, any> | null
  confidence: string | null
  invoiceId: string | null
}

export default function BatchReviewModal({ batchId, onClose }: { batchId: string; onClose: () => void }) {
  const toast = useToast()
  const { data: batch, isLoading } = useBatchDetail(batchId)
  const saveMut = useSaveBatchInvoices()

  const completedItems = (batch?.items ?? []).filter(
    (i: BatchItem) => i.status === 'completed' && i.extractedData && !i.invoiceId,
  )

  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(completedItems.map((i: BatchItem) => i.id)))
  const [corrections, setCorrections] = useState<Record<string, Record<string, any>>>({})
  const [pdfBase64Map, setPdfBase64Map] = useState<Record<string, string>>({})

  const current = completedItems[currentIdx] as BatchItem | undefined

  // Load PDF for current item on demand
  const loadPdf = async (itemId: string) => {
    if (pdfBase64Map[itemId]) return
    try {
      const pdf = await financeApi.invoices.getBatchItemPdf(batchId, itemId)
      setPdfBase64Map(prev => ({ ...prev, [itemId]: pdf }))
    } catch {
      // PDF may have been cleared
    }
  }

  if (current && !pdfBase64Map[current.id]) {
    loadPdf(current.id)
  }

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const setFieldValue = (itemId: string, field: string, value: any) => {
    setCorrections(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value },
    }))
  }

  const getFieldValue = (item: BatchItem, field: string) => {
    return corrections[item.id]?.[field] ?? (item.extractedData as any)?.[field] ?? ''
  }

  const handleSave = async () => {
    const approvedItems = completedItems
      .filter((i: BatchItem) => selected.has(i.id))
      .map((i: BatchItem) => ({
        itemId: i.id,
        corrections: corrections[i.id],
      }))

    if (approvedItems.length === 0) {
      toast.error('Vyberte alespoň jednu fakturu')
      return
    }

    try {
      const result = await saveMut.mutateAsync({ batchId, approvedItems })
      toast.success(`Uloženo ${result.saved} faktur${result.failed > 0 ? `, ${result.failed} selhalo` : ''}`)
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Ukládání selhalo')
    }
  }

  const confVariant = (c: string | null) =>
    c === 'high' ? 'green' : c === 'medium' ? 'yellow' : 'red'
  const confLabel = (c: string | null) =>
    c === 'high' ? 'Vysoká' : c === 'medium' ? 'Střední' : 'Nízká'

  return (
    <Modal open onClose={onClose} extraWide title={`Kontrola dávkové extrakce (${completedItems.length} faktur)`} footer={
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span style={{ fontSize: '.84rem', color: 'var(--text-muted)' }}>
          Vybráno: {selected.size}/{completedItems.length} faktur
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSave} disabled={saveMut.isPending || selected.size === 0}>
            {saveMut.isPending ? 'Ukládám...' : `Uložit vybrané (${selected.size})`}
          </Button>
        </div>
      </div>
    }>
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          Načítám výsledky...
        </div>
      )}

      {!isLoading && completedItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          Žádné faktury ke kontrole. Batch může být stále ve zpracování.
        </div>
      )}

      {!isLoading && current && (
        <div>
          {/* Navigation bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '8px 14px', background: 'var(--surface-2, var(--surface))', borderRadius: 6 }}>
            <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx <= 0}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '.84rem', fontWeight: 500 }}>
              {currentIdx + 1} / {completedItems.length}
            </span>
            <button onClick={() => setCurrentIdx(i => Math.min(completedItems.length - 1, i + 1))} disabled={currentIdx >= completedItems.length - 1}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}>
              <ChevronRight size={16} />
            </button>

            <span style={{ flex: 1 }} />

            <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
              {current.fileName || '—'}
            </span>

            <Badge variant={confVariant(current.confidence)}>{confLabel(current.confidence)}</Badge>

            <button onClick={() => toggleSelected(current.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', gap: 4, color: selected.has(current.id) ? 'var(--primary, #1D9E75)' : 'var(--text-muted)', fontSize: '.82rem' }}>
              {selected.has(current.id) ? <CheckSquare size={16} /> : <Square size={16} />}
              {selected.has(current.id) ? 'Zahrnuto' : 'Nezahrnuto'}
            </button>
          </div>

          {/* Split layout: PDF left, form right */}
          <div style={{
            display: 'flex', gap: 16,
            flexDirection: window.innerWidth <= 900 ? 'column' : 'row',
          }}>
            {/* PDF viewer */}
            <div style={{ flex: '1 1 50%', minWidth: 0, maxHeight: 500 }}>
              {pdfBase64Map[current.id] ? (
                <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Načítám PDF...</div>}>
                  <PdfViewer
                    pdfBase64={pdfBase64Map[current.id]}
                    onTextSelected={() => {}}
                  />
                </Suspense>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Načítám PDF...
                </div>
              )}
            </div>

            {/* Form */}
            <div style={{ flex: '1 1 50%', minWidth: 0, overflowY: 'auto', maxHeight: 500 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <div key={key} style={key === 'description' || key === 'paymentIban' ? { gridColumn: 'span 2' } : {}}>
                    <label style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>{label}</label>
                    <input
                      value={getFieldValue(current, key)}
                      onChange={e => setFieldValue(current.id, key, e.target.value)}
                      style={inputStyle}
                      type={['amountBase', 'vatRate', 'vatAmount', 'amountTotal'].includes(key) ? 'number' : ['issueDate', 'duzp', 'dueDate'].includes(key) ? 'date' : 'text'}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
