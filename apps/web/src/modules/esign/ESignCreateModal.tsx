import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { apiClient } from '../../core/api/client'
import { Modal, Button } from '../../shared/components'
import { FormSection } from '../../shared/components/FormSection'
import { FormField } from '../../shared/components/FormField'
import { useToast } from '../../shared/components/toast/Toast'

interface Props {
  onClose: () => void
  onSuccess: () => void
  initialDocumentType?: string
  initialDocumentId?: string
  initialDocumentTitle?: string
}

export default function ESignCreateModal({ onClose, onSuccess, initialDocumentType, initialDocumentId, initialDocumentTitle }: Props) {
  const { t } = useTranslation()
  const toast = useToast()

  const DOC_TYPES = [
    { value: 'management_contract', label: t('esign.docTypes.management_contract') },
    { value: 'tenancy', label: t('esign.docTypes.tenancy') },
    { value: 'protocol', label: t('esign.docTypes.protocol') },
    { value: 'custom', label: t('esign.docTypes.custom') },
  ]
  const hasInitial = !!(initialDocumentType && initialDocumentId)
  const [step, setStep] = useState(hasInitial ? 2 : 1)
  const [form, setForm] = useState({
    documentType: initialDocumentType ?? 'management_contract',
    documentId: initialDocumentId ?? '',
    documentTitle: initialDocumentTitle ?? '',
    message: '',
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  })
  const [signatories, setSignatories] = useState([
    { name: '', email: '', role: '', order: 1 },
  ])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const addSignatory = () => {
    if (signatories.length >= 5) return
    setSignatories(s => [...s, { name: '', email: '', role: '', order: s.length + 1 }])
  }

  const removeSignatory = (i: number) => {
    setSignatories(s => s.filter((_, idx) => idx !== i).map((sig, idx) => ({ ...sig, order: idx + 1 })))
  }

  const updateSignatory = (i: number, k: string, v: string) => {
    setSignatories(s => s.map((sig, idx) => idx === i ? { ...sig, [k]: v } : sig))
  }

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/esign', {
      ...form,
      signatories,
    }),
    onSuccess: () => { toast.success(t('esign.toast.created')); onSuccess() },
    onError: () => toast.error(t('esign.toast.error')),
  })

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  }

  return (
    <Modal open onClose={onClose} title={t('esign.create')} wide
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>{t('esign.cancel')}</Button>
          {step === 1 && <Button variant="primary" onClick={() => setStep(2)} disabled={!form.documentTitle.trim()}>{t('esign.next')}</Button>}
          {step === 2 && (
            <>
              <Button onClick={() => setStep(1)}>{t('esign.back')}</Button>
              <Button variant="primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || signatories.some(s => !s.name || !s.email)}>
                {createMutation.isPending ? t('esign.submitting') : t('esign.submit')}
              </Button>
            </>
          )}
        </div>
      }>

      {step === 1 && (
        <FormSection title={t('esign.sections.document')} collapsible={false}>
          <FormField label={t('esign.fields.documentType')} name="documentType">
            <select id="documentType" value={form.documentType} onChange={e => set('documentType', e.target.value)} style={inputStyle}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label={t('esign.fields.documentId')} name="documentId">
            <input id="documentId" value={form.documentId} onChange={e => set('documentId', e.target.value)} style={inputStyle} placeholder={t('esign.fields.documentIdPlaceholder')} />
          </FormField>
          <FormField label={t('esign.fields.documentTitle')} name="documentTitle">
            <input id="documentTitle" value={form.documentTitle} onChange={e => set('documentTitle', e.target.value)} style={inputStyle} placeholder={t('esign.fields.documentTitlePlaceholder')} />
          </FormField>
          <FormField label={t('esign.fields.message')} name="message" required={false}>
            <textarea id="message" value={form.message} onChange={e => set('message', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
          </FormField>
          <FormField label={t('esign.fields.expiresAt')} name="expiresAt">
            <input id="expiresAt" type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} style={inputStyle} />
          </FormField>
        </FormSection>
      )}

      {step === 2 && hasInitial && (
        <div style={{ background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.88rem' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{form.documentTitle}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {DOC_TYPES.find(t => t.value === form.documentType)?.label ?? form.documentType}
            {' · '}
            {t('esign.fields.expiresAt')} {form.expiresAt}
          </div>
        </div>
      )}

      {step === 2 && (
        <FormSection title={t('esign.sections.signatories')} collapsible={false}>
          {signatories.map((sig, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
              <FormField label={i === 0 ? t('esign.fields.signatoryName') : ''} name={`sig-name-${i}`}>
                <input value={sig.name} onChange={e => updateSignatory(i, 'name', e.target.value)} style={inputStyle} placeholder="Jan Novák" />
              </FormField>
              <FormField label={i === 0 ? t('esign.fields.signatoryEmail') : ''} name={`sig-email-${i}`}>
                <input type="email" value={sig.email} onChange={e => updateSignatory(i, 'email', e.target.value)} style={inputStyle} placeholder="jan@example.com" />
              </FormField>
              <FormField label={i === 0 ? t('esign.fields.signatoryRole') : ''} name={`sig-role-${i}`} required={false}>
                <input value={sig.role} onChange={e => updateSignatory(i, 'role', e.target.value)} style={inputStyle} placeholder={t('esign.fields.signatoryRolePlaceholder')} />
              </FormField>
              <Button variant="default" size="sm" onClick={() => removeSignatory(i)} disabled={signatories.length <= 1} aria-label={t('esign.removeSignatory')}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <Button variant="default" onClick={addSignatory} disabled={signatories.length >= 5} icon={<Plus size={14} />}>
            {t('esign.addSignatory')}
          </Button>
        </FormSection>
      )}
    </Modal>
  )
}
