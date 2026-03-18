import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Button } from '../../shared/components'
import { PartyPicker } from '../../core/components/PartyPicker'
import { tenanciesApi, type ApiTenancy } from './tenancies-api'

const TYPE_OPTIONS = [
  { value: 'lease', label: 'Nájem' },
  { value: 'sublease', label: 'Podnájem' },
  { value: 'occupancy', label: 'Užívání' },
  { value: 'short_term', label: 'Krátkodobý nájem' },
]

const ROLE_OPTIONS = [
  { value: 'tenant', label: 'Nájemce' },
  { value: 'co_tenant', label: 'Spolunájemce' },
  { value: 'occupant', label: 'Uživatel' },
]

interface Props {
  unitId: string
  propertyId: string
  tenancy?: ApiTenancy
  onClose: () => void
  onSaved: () => void
}

export default function TenancyFormModal({ unitId, tenancy, onClose, onSaved }: Props) {
  const isEdit = !!tenancy
  const qc = useQueryClient()

  const [partyId, setPartyId] = useState<string | null>(tenancy?.partyId ?? null)
  const [type, setType] = useState(tenancy?.type ?? 'lease')
  const [role, setRole] = useState(tenancy?.role ?? '')
  const [contractNo, setContractNo] = useState(tenancy?.contractNo ?? '')
  const [moveInDate, setMoveInDate] = useState(tenancy?.moveInDate?.split('T')[0] ?? '')
  const [validFrom, setValidFrom] = useState(tenancy?.validFrom?.split('T')[0] ?? '')
  const [validTo, setValidTo] = useState(tenancy?.validTo?.split('T')[0] ?? '')
  const [rentAmount, setRentAmount] = useState(tenancy?.rentAmount != null ? String(tenancy.rentAmount) : '')
  const [serviceAdvance, setServiceAdvance] = useState(tenancy?.serviceAdvanceAmount != null ? String(tenancy.serviceAdvanceAmount) : '')
  const [deposit, setDeposit] = useState(tenancy?.depositAmount != null ? String(tenancy.depositAmount) : '')
  const [note, setNote] = useState(tenancy?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return isEdit ? tenanciesApi.update(tenancy!.id, data) : tenanciesApi.create(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenancies'] })
      qc.invalidateQueries({ queryKey: ['properties'] })
      onSaved()
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Chyba při ukládání'),
  })

  const handleSubmit = () => {
    if (!isEdit && !partyId) { setError('Vyberte nájemce'); return }
    if (!type) { setError('Vyberte typ nájmu'); return }
    setError(null)

    const data: Record<string, unknown> = {
      ...(!isEdit ? { unitId, partyId } : {}),
      type,
      role: role || undefined,
      contractNo: contractNo || undefined,
      moveInDate: moveInDate || undefined,
      validFrom: validFrom || undefined,
      validTo: validTo || undefined,
      rentAmount: rentAmount ? Number(rentAmount) : undefined,
      serviceAdvanceAmount: serviceAdvance ? Number(serviceAdvance) : undefined,
      depositAmount: deposit ? Number(deposit) : undefined,
      note: note || undefined,
    }

    mutation.mutate(data)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }
  const sectionStyle: React.CSSProperties = { fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }

  return (
    <Modal
      open onClose={onClose}
      title={isEdit ? 'Upravit nájemní vztah' : 'Přidat nájemce'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Přidat'}
          </Button>
        </div>
      }
    >
      {error && <div style={{ color: 'var(--danger)', fontSize: '.85rem', marginBottom: 12 }}>{error}</div>}

      {/* Nájemce */}
      {!isEdit && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Nájemce *</label>
          <PartyPicker value={partyId} onChange={(id) => setPartyId(id)} placeholder="Hledat nájemce..." />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Typ nájmu *</label>
          <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
            <option value="">— vyberte roli —</option>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Číslo smlouvy</label>
        <input value={contractNo} onChange={e => setContractNo(e.target.value)} style={inputStyle} placeholder="NS-2026/001" />
      </div>

      {/* Termíny */}
      <div style={sectionStyle}>Termíny</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Datum nástupu</label>
          <input type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Platnost od</label>
          <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Platnost do</label>
          <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Finance */}
      <div style={sectionStyle}>Finanční podmínky</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Nájemné (Kč/měs)</label>
          <input type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} style={inputStyle} min={0} />
        </div>
        <div>
          <label style={labelStyle}>Zálohy služby (Kč/měs)</label>
          <input type="number" value={serviceAdvance} onChange={e => setServiceAdvance(e.target.value)} style={inputStyle} min={0} />
        </div>
        <div>
          <label style={labelStyle}>Kauce (Kč)</label>
          <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} style={inputStyle} min={0} />
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
