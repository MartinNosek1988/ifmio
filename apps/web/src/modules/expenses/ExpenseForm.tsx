import { useState, useCallback, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, Badge } from '../../shared/components'
import { FormSection, FormFooter } from '../../shared/components/FormSection'
import { FormField } from '../../shared/components/FormField'
import { CurrencyInput } from '../../shared/components/CurrencyInput'
import { expensesApi } from './api/expenses.api'
import type { ApiExpense } from './api/expenses.api'
import { apiClient } from '../../core/api/client'

const CATEGORIES = [
  { value: 'material', label: 'Material' },
  { value: 'fuel', label: 'PHM' },
  { value: 'transport', label: 'Doprava' },
  { value: 'tools', label: 'Nastroje' },
  { value: 'services', label: 'Sluzby' },
  { value: 'accommodation', label: 'Ubytovani' },
  { value: 'food', label: 'Stravne' },
  { value: 'other', label: 'Ostatni' },
]

const VAT_OPTIONS = [
  { value: 0, label: '0 %' },
  { value: 12, label: '12 %' },
  { value: 21, label: '21 %' },
]

const REIMBURSEMENT_OPTIONS = [
  { value: 'cash', label: 'Hotovost' },
  { value: 'bank_transfer', label: 'Bankovni prevod' },
  { value: 'company_card', label: 'Firemni karta' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  initialWorkOrderId?: string
}

interface FormData {
  description: string
  category: string
  vendor: string
  vendorIco: string
  receiptDate: string
  receiptNumber: string
  amount: number | null
  vatRate: number
  amountTotal: number | null
  propertyId: string
  workOrderId: string
  reimbursementType: string
  imageBase64: string
  mimeType: string
}

const INITIAL_FORM: FormData = {
  description: '',
  category: 'other',
  vendor: '',
  vendorIco: '',
  receiptDate: '',
  receiptNumber: '',
  amount: null,
  vatRate: 21,
  amountTotal: null,
  propertyId: '',
  workOrderId: '',
  reimbursementType: 'bank_transfer',
  imageBase64: '',
  mimeType: '',
}

export function ExpenseForm({ open, onClose, onSuccess, initialWorkOrderId }: Props) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FormData>({
    ...INITIAL_FORM,
    workOrderId: initialWorkOrderId ?? '',
  })
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [extracting, setExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiClient.get<{ id: string; name: string }[]>('/properties').then((r) => r.data),
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<ApiExpense> & { submitAfter?: boolean }) => {
      const { submitAfter, ...payload } = data
      if (submitAfter) {
        return expensesApi.create(payload).then((created) => expensesApi.submit(created.id))
      }
      return expensesApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      resetAndClose()
      onSuccess()
    },
  })

  const resetAndClose = useCallback(() => {
    setStep(1)
    setForm({ ...INITIAL_FORM, workOrderId: initialWorkOrderId ?? '' })
    setAiConfidence(null)
    onClose()
  }, [initialWorkOrderId, onClose])

  const handleFileChange = useCallback(
    async (file: File) => {
      setExtracting(true)
      try {
        const base64 = await fileToBase64(file)
        const mimeType = file.type
        setForm((f) => ({ ...f, imageBase64: base64, mimeType }))

        const extracted = await expensesApi.extract({ imageBase64: base64, mimeType })
        setAiConfidence(extracted.confidence)
        setForm((f) => ({
          ...f,
          description: extracted.description ?? f.description,
          category: extracted.category ?? f.category,
          vendor: extracted.vendor ?? f.vendor,
          vendorIco: extracted.vendorIco ?? f.vendorIco,
          receiptDate: extracted.receiptDate ?? f.receiptDate,
          receiptNumber: extracted.receiptNumber ?? f.receiptNumber,
          amount: extracted.amount ?? f.amount,
          vatRate: extracted.vatRate ?? f.vatRate,
          amountTotal: extracted.amountTotal ?? f.amountTotal,
        }))
        setStep(2)
      } catch {
        // extraction failed — user can fill manually
        setStep(2)
      } finally {
        setExtracting(false)
      }
    },
    [],
  )

  const handleSubmit = useCallback(
    (asDraft: boolean) => {
      createMutation.mutate({
        description: form.description,
        category: form.category,
        vendor: form.vendor || undefined,
        vendorIco: form.vendorIco || undefined,
        receiptDate: form.receiptDate,
        receiptNumber: form.receiptNumber || undefined,
        amount: form.amount ?? 0,
        vatRate: form.vatRate,
        amountTotal: form.amountTotal ?? 0,
        propertyId: form.propertyId || undefined,
        workOrderId: form.workOrderId || undefined,
        reimbursementType: form.reimbursementType,
        imageBase64: form.imageBase64 || undefined,
        mimeType: form.mimeType || undefined,
        status: 'draft',
        submitAfter: !asDraft,
      } as Partial<ApiExpense> & { submitAfter?: boolean })
    },
    [form, createMutation],
  )

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--color-surface, #fff)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Novy vydaj" wide>
      {step === 1 && (
        <div>
          {extracting ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>&#129302;</div>
              <div style={{ fontWeight: 600, color: 'var(--dark)' }}>Analyzuji doklad...</div>
            </div>
          ) : (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const file = e.dataTransfer.files[0]
                  if (file) handleFileChange(file)
                }}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 12,
                  padding: 40,
                  textAlign: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: 4 }}>
                  Pretahnete nebo kliknete pro nahrani dokladu
                </div>
                <div style={{ fontSize: '0.8rem' }}>JPEG, PNG nebo PDF</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileChange(file)
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setStep(2)}
                  style={{ marginTop: 8 }}
                >
                  Preskocit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          {aiConfidence != null && (
            <div style={{ marginBottom: 12 }}>
              <Badge variant={aiConfidence > 0.8 ? 'green' : aiConfidence > 0.5 ? 'yellow' : 'red'}>
                AI spolehlivost: {Math.round(aiConfidence * 100)} %
              </Badge>
            </div>
          )}

          <FormSection title="Doklad">
            <FormField label="Popis" name="description">
              <input
                id="description"
                type="text"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Kategorie" name="category">
              <select
                id="category"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                style={inputStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Dodavatel" name="vendor" required={false}>
                <input
                  id="vendor"
                  type="text"
                  value={form.vendor}
                  onChange={(e) => updateField('vendor', e.target.value)}
                  style={inputStyle}
                />
              </FormField>
              <FormField label="ICO dodavatele" name="vendorIco" required={false}>
                <input
                  id="vendorIco"
                  type="text"
                  value={form.vendorIco}
                  onChange={(e) => updateField('vendorIco', e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono, monospace)' }}
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Datum dokladu" name="receiptDate">
                <input
                  id="receiptDate"
                  type="date"
                  value={form.receiptDate}
                  onChange={(e) => updateField('receiptDate', e.target.value)}
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Cislo dokladu" name="receiptNumber" required={false}>
                <input
                  id="receiptNumber"
                  type="text"
                  value={form.receiptNumber}
                  onChange={(e) => updateField('receiptNumber', e.target.value)}
                  style={inputStyle}
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
              <FormField label="Castka bez DPH" name="amount">
                <CurrencyInput
                  value={form.amount}
                  onChange={(v) => updateField('amount', v)}
                  name="amount"
                />
              </FormField>
              <FormField label="DPH" name="vatRate">
                <div style={{ display: 'flex', gap: 6 }}>
                  {VAT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 10px', borderRadius: 6,
                        border: `1px solid ${form.vatRate === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                        background: form.vatRate === opt.value ? 'rgba(99,102,241,0.08)' : 'transparent',
                        cursor: 'pointer', fontSize: '0.85rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="vatRate"
                        value={opt.value}
                        checked={form.vatRate === opt.value}
                        onChange={() => updateField('vatRate', opt.value)}
                        style={{ display: 'none' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </FormField>
              <FormField label="Castka celkem" name="amountTotal">
                <CurrencyInput
                  value={form.amountTotal}
                  onChange={(v) => updateField('amountTotal', v)}
                  name="amountTotal"
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Prirazeni">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Nemovitost" name="propertyId" required={false}>
                <select
                  id="propertyId"
                  value={form.propertyId}
                  onChange={(e) => updateField('propertyId', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- nevybrano --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Pracovni ukol" name="workOrderId" required={false}>
                <input
                  id="workOrderId"
                  type="text"
                  value={form.workOrderId}
                  onChange={(e) => updateField('workOrderId', e.target.value)}
                  style={inputStyle}
                />
              </FormField>
            </div>

            <FormField label="Typ proplaceni" name="reimbursementType">
              <div style={{ display: 'flex', gap: 8 }}>
                {REIMBURSEMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', borderRadius: 6,
                      border: `1px solid ${form.reimbursementType === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.reimbursementType === opt.value ? 'rgba(99,102,241,0.08)' : 'transparent',
                      cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="reimbursementType"
                      value={opt.value}
                      checked={form.reimbursementType === opt.value}
                      onChange={() => updateField('reimbursementType', opt.value)}
                      style={{ display: 'none' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </FormField>
          </FormSection>

          <FormFooter
            onCancel={resetAndClose}
            onSubmit={() => handleSubmit(false)}
            isSubmitting={createMutation.isPending}
            isValid={!!form.description && !!form.receiptDate}
            submitLabel="Odeslat ke schvaleni"
            showDraft
            onSaveDraft={() => handleSubmit(true)}
          />
        </div>
      )}
    </Modal>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix to get raw base64
      const base64 = result.split(',')[1] ?? result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
