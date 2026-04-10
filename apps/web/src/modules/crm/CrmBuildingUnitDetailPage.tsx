import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Edit2 } from 'lucide-react'
import { Badge, Button, LoadingSpinner, Modal } from '../../shared/components'
import { FormField } from '../../shared/components/FormField'
import { apiClient } from '../../core/api/client'

const UNIT_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Byt', NON_RESIDENTIAL: 'Nebytový prostor', GARAGE: 'Garáž', OTHER: 'Jiný',
}

export default function CrmBuildingUnitDetailPage() {
  const { buildingId, unitId } = useParams<{ buildingId: string; unitId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)

  const { data: unit, isLoading, isError } = useQuery({
    queryKey: ['kb', 'building', buildingId, 'unit', unitId],
    queryFn: () => apiClient.get(`/knowledge-base/buildings/${buildingId}/units/${unitId}`).then(r => r.data),
    enabled: !!buildingId && !!unitId,
  })

  if (isLoading) return <LoadingSpinner />
  if (isError || !unit) return <div style={{ padding: 24, color: 'var(--danger)' }}>Jednotka nenalezena</div>

  const building = unit.building
  const buildingAddress = [building?.street, building?.houseNumber, building?.orientationNumber ? `/${building.orientationNumber}` : '', building?.city].filter(Boolean).join(' ')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Button variant="default" size="sm" icon={<ArrowLeft size={15} />} onClick={() => navigate(`/crm/buildings/${buildingId}`)}>
          Zpět
        </Button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <Link to="/crm/buildings" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Budovy</Link>
            {' > '}
            <Link to={`/crm/buildings/${buildingId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{buildingAddress}</Link>
            {' > '}Jednotka
          </div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '4px 0 0' }}>
            Jednotka {unit.unitNumber ?? unit.id.slice(0, 8)}
          </h1>
        </div>
        {unit.unitType && <Badge variant="blue">{UNIT_TYPE_LABELS[unit.unitType] ?? unit.unitType}</Badge>}
        <Button size="sm" icon={<Edit2 size={14} />} onClick={() => setShowEdit(true)}>Upravit</Button>
      </div>

      {/* Section 1 — Basic info */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Základní údaje</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: '0.88rem' }}>
          <InfoRow label="Číslo jednotky" value={unit.unitNumber} />
          <InfoRow label="Typ" value={UNIT_TYPE_LABELS[unit.unitType] ?? unit.unitType} />
          <InfoRow label="Využití" value={unit.usage} />
          <InfoRow label="Dispozice" value={unit.roomLayout} />
          <InfoRow label="Podlaží" value={unit.floor} />
          <InfoRow label="Plocha" value={unit.area ? `${unit.area} m²` : null} />
          <InfoRow label="Podíl na SČ" value={unit.shareNumerator && unit.shareDenominator ? `${unit.shareNumerator}/${unit.shareDenominator}` : null} mono />
          <InfoRow label="List vlastnictví" value={unit.lvNumber} mono />
          <InfoRow label="RÚIAN ID" value={unit.ruianUnitId} mono />
          <InfoRow label="ČÚZK stavba ID" value={unit.cuzkStavbaId} mono />
        </div>
        {unit.lvNumber && (
          <a href="https://nahlizenidokn.cuzk.cz/" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: '0.82rem', color: 'var(--primary)' }}>
            <ExternalLink size={13} /> Nahlížení do katastru (LV {unit.lvNumber})
          </a>
        )}
      </div>

      {/* Section 2 — Owners */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Vlastníci</h3>
        {(unit.ownerships?.length ?? 0) === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
            Vlastníci nejsou k dispozici — vyžaduje ČÚZK Dálkový přístup
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }}>Jméno</th>
                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }}>Typ</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }}>Podíl</th>
              </tr>
            </thead>
            <tbody>
              {unit.ownerships.map((o: any) => {
                const person = o.person
                const org = o.organization
                const name = person
                  ? [person.titulPred, person.firstName, person.lastName, person.titulZa].filter(Boolean).join(' ')
                  : org?.name ?? '—'
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 0' }}>{name}</td>
                    <td style={{ padding: '6px 0' }}>{o.ownershipType ?? '—'}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace' }}>
                      {o.shareNumerator && o.shareDenominator ? `${o.shareNumerator}/${o.shareDenominator}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 3 — Linked tenant units */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Propojení s business vrstvou</h3>
        {(unit.units?.length ?? 0) === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nepropojeno s žádnou spravovanou jednotkou</div>
        ) : (
          unit.units.map((u: any) => (
            <div key={u.id} style={{ fontSize: '0.88rem', marginBottom: 4 }}>
              Propojeno s jednotkou <strong>{u.name}</strong>
              {u.property && <> v <Link to={`/properties/${u.propertyId}`} style={{ color: 'var(--primary)' }}>{u.property.name}</Link></>}
            </div>
          ))
        )}
      </div>

      {/* Edit modal */}
      {showEdit && <EditUnitModal buildingId={buildingId!} unitId={unitId!} unit={unit} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); qc.invalidateQueries({ queryKey: ['kb', 'building', buildingId, 'unit'] }) }} />}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{label}</span>
      <div style={{ fontWeight: 500, fontFamily: mono ? 'monospace' : undefined }}>{value ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
    </div>
  )
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const num = Number(trimmed)
  return Number.isNaN(num) ? null : num
}

function EditUnitModal({ buildingId, unitId, unit, onClose, onSaved }: { buildingId: string; unitId: string; unit: any; onClose: () => void; onSaved: () => void }) {
  const [area, setArea] = useState(unit.area?.toString() ?? '')
  const [floor, setFloor] = useState(unit.floor?.toString() ?? '')
  const [roomLayout, setRoomLayout] = useState(unit.roomLayout ?? '')

  const mut = useMutation({
    mutationFn: () => {
      const trimmedLayout = roomLayout.trim()
      return apiClient.patch(`/knowledge-base/buildings/${buildingId}/units/${unitId}`, {
        area: parseOptionalNumber(area),
        floor: parseOptionalNumber(floor),
        roomLayout: trimmedLayout === '' ? null : trimmedLayout,
      })
    },
    onSuccess: onSaved,
  })

  return (
    <Modal open onClose={onClose} title={`Upravit jednotku ${unit.unitNumber ?? ''}`}>
      <FormField label="Plocha (m²)" name="area" required={false}>
        <input className="input" type="number" value={area} onChange={e => setArea(e.target.value)} />
      </FormField>
      <FormField label="Podlaží" name="floor" required={false}>
        <input className="input" type="number" value={floor} onChange={e => setFloor(e.target.value)} />
      </FormField>
      <FormField label="Dispozice" name="roomLayout" required={false}>
        <input className="input" value={roomLayout} onChange={e => setRoomLayout(e.target.value)} placeholder="2+kk, 3+1..." />
      </FormField>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? 'Ukládám...' : 'Uložit'}
        </Button>
      </div>
    </Modal>
  )
}
