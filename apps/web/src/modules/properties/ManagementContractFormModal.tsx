import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Button } from '../../shared/components'
import { apiClient } from '../../core/api/client'
import { managementContractsApi, type ApiManagementContract } from './management-contracts-api'

const TYPE_OPTIONS = [
  { value: 'hoa_management', label: 'Správa SVJ/BD' },
  { value: 'rental_management', label: 'Správa pronájmů' },
  { value: 'technical_management', label: 'Technická správa' },
  { value: 'accounting_management', label: 'Účetní správa' },
  { value: 'admin_management', label: 'Administrativní správa' },
]

const SCOPE_OPTIONS = [
  { value: 'whole_property', label: 'Celá nemovitost' },
  { value: 'selected_units', label: 'Vybrané jednotky' },
]

interface Props {
  propertyId?: string
  principalId?: string
  contract?: ApiManagementContract
  onClose: () => void
  onSaved: () => void
}

export default function ManagementContractFormModal({ propertyId, principalId, contract, onClose, onSaved }: Props) {
  const isEdit = !!contract
  const qc = useQueryClient()

  const [formPropertyId, setFormPropertyId] = useState(contract?.propertyId ?? propertyId ?? '')
  const [formPrincipalId, setFormPrincipalId] = useState(contract?.principalId ?? principalId ?? '')
  const [type, setType] = useState(contract?.type ?? 'hoa_management')
  const [name, setName] = useState(contract?.name ?? '')
  const [contractNo, setContractNo] = useState(contract?.contractNo ?? '')
  const [scope, setScope] = useState(contract?.scope ?? 'whole_property')
  const [isActive, setIsActive] = useState(contract?.isActive ?? true)
  const [validFrom, setValidFrom] = useState(contract?.validFrom?.split('T')[0] ?? '')
  const [validTo, setValidTo] = useState(contract?.validTo?.split('T')[0] ?? '')
  const [note, setNote] = useState(contract?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const { data: properties = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['properties'],
    queryFn: () => apiClient.get('/properties').then(r => r.data),
    enabled: !propertyId,
  })

  const { data: principalsData } = useQuery<{ data: Array<{ id: string; displayName: string }> }>({
    queryKey: ['principals', 'list'],
    queryFn: () => apiClient.get('/principals', { params: { limit: 100 } }).then(r => r.data),
    enabled: !principalId,
  })
  const principals = principalsData?.data ?? []

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return isEdit ? managementContractsApi.update(contract!.id, data) : managementContractsApi.create(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['management-contracts'] })
      qc.invalidateQueries({ queryKey: ['principals'] })
      onSaved()
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Chyba při ukládání'),
  })

  const handleSubmit = () => {
    if (!formPropertyId || !formPrincipalId) { setError('Vyberte nemovitost a správce'); return }
    setError(null)

    mutation.mutate({
      ...(!isEdit ? { propertyId: formPropertyId, principalId: formPrincipalId } : {}),
      type,
      name: name || undefined,
      contractNo: contractNo || undefined,
      scope,
      isActive,
      validFrom: validFrom || undefined,
      validTo: validTo || undefined,
      note: note || undefined,
    })
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }
  const sectionStyle: React.CSSProperties = { fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit smlouvu správy' : 'Nová smlouva správy'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      {error && <div style={{ color: 'var(--danger)', fontSize: '.85rem', marginBottom: 12 }}>{error}</div>}

      {/* Smluvní strany */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Nemovitost *</label>
          <select value={formPropertyId} onChange={e => setFormPropertyId(e.target.value)} style={inputStyle} disabled={!!propertyId || isEdit}>
            <option value="">— vyberte —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            {propertyId && !properties.find(p => p.id === propertyId) && <option value={propertyId}>{propertyId}</option>}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Správce / Mandant *</label>
          <select value={formPrincipalId} onChange={e => setFormPrincipalId(e.target.value)} style={inputStyle} disabled={!!principalId || isEdit}>
            <option value="">— vyberte —</option>
            {principals.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            {principalId && !principals.find(p => p.id === principalId) && <option value={principalId}>{principalId}</option>}
          </select>
        </div>
      </div>

      {/* Smlouva */}
      <div style={sectionStyle}>Smlouva</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Typ smlouvy *</label>
          <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Rozsah</label>
          <select value={scope} onChange={e => setScope(e.target.value)} style={inputStyle}>
            {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Název smlouvy</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Číslo smlouvy</label>
          <input value={contractNo} onChange={e => setContractNo(e.target.value)} style={inputStyle} placeholder="SS-2026/001" />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', marginBottom: 12 }}>
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> Aktivní
      </label>

      {/* Platnost */}
      <div style={sectionStyle}>Platnost</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Platnost od</label>
          <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Platnost do</label>
          <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Poznámka */}
      <div>
        <label style={labelStyle}>Poznámka</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
    </Modal>
  )
}
