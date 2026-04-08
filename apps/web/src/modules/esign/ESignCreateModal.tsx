import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { apiClient } from '../../core/api/client'
import { Modal, Button } from '../../shared/components'
import { FormSection } from '../../shared/components/FormSection'
import { FormField } from '../../shared/components/FormField'
import { useToast } from '../../shared/components/toast/Toast'

const DOC_TYPES = [
  { value: 'management_contract', label: 'Smlouva o správě' },
  { value: 'tenancy', label: 'Nájemní smlouva' },
  { value: 'protocol', label: 'Protokol' },
  { value: 'custom', label: 'Vlastní dokument' },
]

interface Props { onClose: () => void; onSuccess: () => void }

export default function ESignCreateModal({ onClose, onSuccess }: Props) {
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    documentType: 'management_contract',
    documentId: '',
    documentTitle: '',
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
    onSuccess: () => { toast.success('Žádost vytvořena'); onSuccess() },
    onError: () => toast.error('Vytvoření selhalo'),
  })

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  }

  return (
    <Modal open onClose={onClose} title="Nová žádost o podpis" wide
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          {step === 1 && <Button variant="primary" onClick={() => setStep(2)} disabled={!form.documentTitle.trim()}>Další →</Button>}
          {step === 2 && (
            <>
              <Button onClick={() => setStep(1)}>← Zpět</Button>
              <Button variant="primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || signatories.some(s => !s.name || !s.email)}>
                {createMutation.isPending ? 'Vytvářím...' : 'Vytvořit'}
              </Button>
            </>
          )}
        </div>
      }>

      {step === 1 && (
        <FormSection title="Dokument" collapsible={false}>
          <FormField label="Typ dokumentu" name="documentType">
            <select id="documentType" value={form.documentType} onChange={e => set('documentType', e.target.value)} style={inputStyle}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="ID dokumentu" name="documentId">
            <input id="documentId" value={form.documentId} onChange={e => set('documentId', e.target.value)} style={inputStyle} placeholder="ID smlouvy nebo protokolu" />
          </FormField>
          <FormField label="Název dokumentu" name="documentTitle">
            <input id="documentTitle" value={form.documentTitle} onChange={e => set('documentTitle', e.target.value)} style={inputStyle} placeholder="Smlouva o správě — Bytový dům Krásná 12" />
          </FormField>
          <FormField label="Průvodní zpráva" name="message" required={false}>
            <textarea id="message" value={form.message} onChange={e => set('message', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
          </FormField>
          <FormField label="Platnost do" name="expiresAt">
            <input id="expiresAt" type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} style={inputStyle} />
          </FormField>
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title="Podepisující" collapsible={false}>
          {signatories.map((sig, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
              <FormField label={i === 0 ? 'Jméno *' : ''} name={`sig-name-${i}`}>
                <input value={sig.name} onChange={e => updateSignatory(i, 'name', e.target.value)} style={inputStyle} placeholder="Jan Novák" />
              </FormField>
              <FormField label={i === 0 ? 'Email *' : ''} name={`sig-email-${i}`}>
                <input type="email" value={sig.email} onChange={e => updateSignatory(i, 'email', e.target.value)} style={inputStyle} placeholder="jan@example.com" />
              </FormField>
              <FormField label={i === 0 ? 'Role' : ''} name={`sig-role-${i}`} required={false}>
                <input value={sig.role} onChange={e => updateSignatory(i, 'role', e.target.value)} style={inputStyle} placeholder="Předseda SVJ" />
              </FormField>
              <Button variant="default" size="sm" onClick={() => removeSignatory(i)} disabled={signatories.length <= 1} aria-label="Odebrat">
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <Button variant="default" onClick={addSignatory} disabled={signatories.length >= 5} icon={<Plus size={14} />}>
            Přidat podepisujícího
          </Button>
        </FormSection>
      )}
    </Modal>
  )
}
