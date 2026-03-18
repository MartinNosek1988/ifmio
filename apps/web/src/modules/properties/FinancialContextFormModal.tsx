import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Button } from '../../shared/components'
import { financialContextsApi, type ApiFinancialContext } from './financial-contexts-api'

const SCOPE_TYPE_OPTIONS = [
  { value: 'property', label: 'Nemovitost' },
  { value: 'principal', label: 'Správce / mandant' },
  { value: 'manager', label: 'Správcovská firma' },
]

interface Props {
  propertyId?: string
  principalId?: string
  context?: ApiFinancialContext
  onClose: () => void
  onSaved: () => void
}

export default function FinancialContextFormModal({ propertyId, principalId, context, onClose, onSaved }: Props) {
  const isEdit = !!context
  const qc = useQueryClient()

  const [displayName, setDisplayName] = useState(context?.displayName ?? '')
  const [scopeType, setScopeType] = useState(context?.scopeType ?? 'property')
  const [code, setCode] = useState(context?.code ?? '')
  const [currency, setCurrency] = useState(context?.currency ?? 'CZK')
  const [vatPayer, setVatPayer] = useState(context?.vatPayer ?? false)
  const [vatEnabled, setVatEnabled] = useState(context?.vatEnabled ?? false)
  const [invoicePrefix, setInvoicePrefix] = useState(context?.invoicePrefix ?? '')
  const [creditNotePrefix, setCreditNotePrefix] = useState('')
  const [orderPrefix, setOrderPrefix] = useState('')
  const [brandingName, setBrandingName] = useState('')
  const [brandingEmail, setBrandingEmail] = useState('')
  const [brandingPhone, setBrandingPhone] = useState('')
  const [brandingWebsite, setBrandingWebsite] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return isEdit ? financialContextsApi.update(context!.id, data) : financialContextsApi.create(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-contexts'] })
      onSaved()
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Chyba při ukládání'),
  })

  const handleSubmit = () => {
    if (!displayName.trim()) { setError('Název je povinný'); return }
    setError(null)
    mutation.mutate({
      ...(!isEdit ? { scopeType, propertyId, principalId } : {}),
      displayName: displayName.trim(),
      code: code || undefined,
      currency: currency || 'CZK',
      vatPayer, vatEnabled,
      invoicePrefix: invoicePrefix || undefined,
      creditNotePrefix: creditNotePrefix || undefined,
      orderPrefix: orderPrefix || undefined,
      brandingName: brandingName || undefined,
      brandingEmail: brandingEmail || undefined,
      brandingPhone: brandingPhone || undefined,
      brandingWebsite: brandingWebsite || undefined,
      note: note || undefined,
    })
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }
  const sectionStyle: React.CSSProperties = { fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit finanční kontext' : 'Nový finanční kontext'}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
        </Button>
      </div>}
    >
      {error && <div style={{ color: 'var(--danger)', fontSize: '.85rem', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Název *</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} placeholder="Finanční kontext SVJ" />
        </div>
        <div>
          <label style={labelStyle}>Typ kontextu *</label>
          <select value={scopeType} onChange={e => setScopeType(e.target.value)} style={inputStyle} disabled={isEdit}>
            {SCOPE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={labelStyle}>Kód</label><input value={code} onChange={e => setCode(e.target.value)} style={inputStyle} placeholder="FC-001" /></div>
        <div><label style={labelStyle}>Měna</label><input value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle} /></div>
      </div>

      <div style={sectionStyle}>DPH</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem' }}><input type="checkbox" checked={vatPayer} onChange={e => setVatPayer(e.target.checked)} /> Plátce DPH</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem' }}><input type="checkbox" checked={vatEnabled} onChange={e => setVatEnabled(e.target.checked)} /> DPH povoleno</label>
      </div>

      <div style={sectionStyle}>Číslování dokladů</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={labelStyle}>Prefix faktur</label><input value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Prefix dobropisů</label><input value={creditNotePrefix} onChange={e => setCreditNotePrefix(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Prefix objednávek</label><input value={orderPrefix} onChange={e => setOrderPrefix(e.target.value)} style={inputStyle} /></div>
      </div>

      <div style={sectionStyle}>Branding</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={labelStyle}>Název firmy</label><input value={brandingName} onChange={e => setBrandingName(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Email</label><input type="email" value={brandingEmail} onChange={e => setBrandingEmail(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Telefon</label><input value={brandingPhone} onChange={e => setBrandingPhone(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Web</label><input value={brandingWebsite} onChange={e => setBrandingWebsite(e.target.value)} style={inputStyle} /></div>
      </div>

      <div><label style={labelStyle}>Poznámka</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
    </Modal>
  )
}
