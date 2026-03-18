import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Button } from '../../shared/components'
import { PartyPicker } from '../../core/components/PartyPicker'
import { ownershipsApi, type ApiOwnership } from './ownerships-api'

const ROLE_OPTIONS = [
  { value: 'legal_owner', label: 'Vlastník (právní)' },
  { value: 'beneficial_owner', label: 'Vlastník (ekonomický)' },
  { value: 'managing_owner', label: 'Správce vlastník' },
  { value: 'silent_coowner', label: 'Tichý spoluvlastník' },
]

interface Props {
  type: 'property' | 'unit'
  propertyId?: string
  unitId?: string
  ownership?: ApiOwnership
  onClose: () => void
  onSaved: () => void
}

export default function OwnershipFormModal({ type, propertyId, unitId, ownership, onClose, onSaved }: Props) {
  const isEdit = !!ownership
  const qc = useQueryClient()

  const [partyId, setPartyId] = useState<string | null>(ownership?.partyId ?? null)
  const [role, setRole] = useState(ownership?.role ?? '')
  const [shareNum, setShareNum] = useState(ownership?.shareNumerator != null ? String(ownership.shareNumerator) : '')
  const [shareDen, setShareDen] = useState(ownership?.shareDenominator != null ? String(ownership.shareDenominator) : '')
  const [validFrom, setValidFrom] = useState(ownership?.validFrom?.split('T')[0] ?? '')
  const [validTo, setValidTo] = useState(ownership?.validTo?.split('T')[0] ?? '')
  const [note, setNote] = useState(ownership?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (isEdit) {
        return type === 'property'
          ? ownershipsApi.updatePropertyOwnership(ownership!.id, data)
          : ownershipsApi.updateUnitOwnership(ownership!.id, data)
      }
      return type === 'property'
        ? ownershipsApi.createPropertyOwnership(data)
        : ownershipsApi.createUnitOwnership(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ownerships'] })
      onSaved()
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Chyba při ukládání'),
  })

  const computedPercent = shareNum && shareDen && Number(shareDen) > 0
    ? (Number(shareNum) / Number(shareDen) * 100).toFixed(2)
    : null

  const handleSubmit = () => {
    if (!isEdit && !partyId) { setError('Vyberte subjekt'); return }
    setError(null)

    const data: Record<string, unknown> = {
      ...(type === 'property' && propertyId ? { propertyId } : {}),
      ...(type === 'unit' && unitId ? { unitId } : {}),
      ...(!isEdit ? { partyId } : {}),
      role: role || undefined,
      shareNumerator: shareNum ? Number(shareNum) : undefined,
      shareDenominator: shareDen ? Number(shareDen) : undefined,
      sharePercent: computedPercent ? Number(computedPercent) : undefined,
      validFrom: validFrom || undefined,
      validTo: validTo || undefined,
      note: note || undefined,
    }

    mutation.mutate(data)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }

  return (
    <Modal
      open onClose={onClose}
      title={isEdit ? 'Upravit vlastnictví' : 'Přidat vlastníka'}
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

      {!isEdit && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Subjekt *</label>
          <PartyPicker value={partyId} onChange={(id) => setPartyId(id)} placeholder="Hledat vlastníka..." />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Role</label>
        <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
          <option value="">— vyberte roli —</option>
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Podíl — čitatel</label>
          <input type="number" value={shareNum} onChange={e => setShareNum(e.target.value)} style={inputStyle} min={0} placeholder="např. 692" />
        </div>
        <div>
          <label style={labelStyle}>Podíl — jmenovatel</label>
          <input type="number" value={shareDen} onChange={e => setShareDen(e.target.value)} style={inputStyle} min={1} placeholder="např. 55076" />
        </div>
      </div>
      {computedPercent && (
        <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          = {computedPercent} %
        </div>
      )}

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

      <div>
        <label style={labelStyle}>Poznámka</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
    </Modal>
  )
}
