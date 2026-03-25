import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { LoadingState, EmptyState, ErrorState, Modal, Button } from '../../shared/components'
import { propertiesApi, type ApiOccupancy, type ApiRoom, type ApiEquipment, type ApiFee, type ApiMeter, type ApiComponentAssignment } from './properties-api'

type Tab = 'general' | 'rooms' | 'quantities' | 'equipment' | 'owners' | 'prescriptions' | 'meters' | 'fees' | 'profile'

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'Obecné' },
  { key: 'rooms', label: 'Plochy' },
  { key: 'quantities', label: 'Veličiny' },
  { key: 'equipment', label: 'Vybavení' },
  { key: 'owners', label: 'Vlastníci' },
  { key: 'prescriptions', label: 'Složky předpisu' },
  { key: 'meters', label: 'Měřidla' },
  { key: 'fees', label: 'Správní odměna' },
  { key: 'profile', label: 'Profil' },
]

const SPACE_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Byt', NON_RESIDENTIAL: 'Nebytový', GARAGE: 'Garáž',
  PARKING: 'Parkovací stání', CELLAR: 'Sklep', LAND: 'Pozemek',
}

const CALC_LABELS: Record<string, string> = { flat: 'paušál', per_area: 'dle plochy', per_person: 'dle osob' }

const METER_TYPE_LABELS: Record<string, string> = {
  elektrina: 'Elektřina', voda_studena: 'Studená voda', voda_tepla: 'Teplá voda', plyn: 'Plyn', teplo: 'Teplo',
}

function fmtDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString('cs') : null
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '.85rem' }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--dark)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function NA() {
  return <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>neuvedeno</span>
}

function Card({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div style={{ flex: 1, background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '.95rem', color: 'var(--dark)' }}>{title}</div>
        {actions}
      </div>
      {children}
    </div>
  )
}

function ValidityBadge({ from, to }: { from?: string | null; to?: string | null }) {
  if (!from) return <span className="badge badge--teal">od počátku</span>
  const isActive = !to || new Date(to) >= new Date()
  return <span className={`badge badge--${isActive ? 'green' : 'red'}`}>{isActive ? `od ${fmtDate(from)}` : `do ${fmtDate(to)}`}</span>
}

export default function UnitDetailPage() {
  const { id: propertyId, unitId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('general')

  const pid = propertyId!
  const uid = unitId!
  const unitKeys = ['properties', pid, 'units', uid] as const

  const { data: property } = useQuery({ queryKey: ['properties', pid], queryFn: () => propertiesApi.getById(pid), enabled: !!pid })
  const { data: unit, isLoading, error } = useQuery({ queryKey: [...unitKeys], queryFn: () => propertiesApi.getUnit(pid, uid), enabled: !!pid && !!uid })
  const { data: nav } = useQuery({ queryKey: [...unitKeys, 'nav'], queryFn: () => propertiesApi.getUnitNav(pid, uid), enabled: !!pid && !!uid })
  const { data: rooms = [], refetch: refetchRooms } = useQuery({ queryKey: [...unitKeys, 'rooms'], queryFn: () => propertiesApi.listRooms(pid, uid), enabled: !!pid && !!uid && tab === 'rooms' })
  const { data: quantities = [], refetch: refetchQty } = useQuery({ queryKey: [...unitKeys, 'quantities'], queryFn: () => propertiesApi.listQuantities(pid, uid), enabled: !!pid && !!uid && tab === 'quantities' })
  const { data: equipment = [], refetch: refetchEq } = useQuery({ queryKey: [...unitKeys, 'equipment'], queryFn: () => propertiesApi.listEquipment(pid, uid), enabled: !!pid && !!uid && tab === 'equipment' })
  const { data: fees = [], refetch: refetchFees } = useQuery({ queryKey: [...unitKeys, 'fees'], queryFn: () => propertiesApi.listFees(pid, uid), enabled: !!pid && !!uid && tab === 'fees' })
  const { data: meters = [] } = useQuery({ queryKey: [...unitKeys, 'meters'], queryFn: () => propertiesApi.listUnitMeters(pid, uid), enabled: !!pid && !!uid && tab === 'meters' })
  const { data: prescComps = [] } = useQuery({ queryKey: [...unitKeys, 'presc-components'], queryFn: () => propertiesApi.listUnitPrescriptionComponents(pid, uid), enabled: !!pid && !!uid && tab === 'prescriptions' })

  // ─── Rooms state ─────────────────────────────────────────
  const [addingRoom, setAddingRoom] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', area: '', coefficient: '1.000', roomType: 'standard', includeTuv: true })
  const [editRoomId, setEditRoomId] = useState<string | null>(null)
  const [editRoomForm, setEditRoomForm] = useState<Record<string, string | boolean>>({})

  const createRoomMut = useMutation({
    mutationFn: () => propertiesApi.createRoom(pid, uid, { name: roomForm.name, area: parseFloat(roomForm.area), coefficient: parseFloat(roomForm.coefficient), roomType: roomForm.roomType, includeTuv: roomForm.includeTuv }),
    onSuccess: () => { refetchRooms(); setAddingRoom(false); setRoomForm({ name: '', area: '', coefficient: '1.000', roomType: 'standard', includeTuv: true }) },
  })
  const updateRoomMut = useMutation({
    mutationFn: (roomId: string) => propertiesApi.updateRoom(pid, uid, roomId, {
      name: editRoomForm.name as string, area: parseFloat(editRoomForm.area as string), coefficient: parseFloat(editRoomForm.coefficient as string),
      roomType: editRoomForm.roomType as string, includeTuv: editRoomForm.includeTuv as boolean,
    }),
    onSuccess: () => { refetchRooms(); setEditRoomId(null) },
  })
  const deleteRoomMut = useMutation({ mutationFn: (roomId: string) => propertiesApi.deleteRoom(pid, uid, roomId), onSuccess: () => refetchRooms() })

  // ─── Quantities state ────────────────────────────────────
  const [addingQty, setAddingQty] = useState(false)
  const [qtyForm, setQtyForm] = useState({ name: '', value: '', unitLabel: '' })
  const [editQtyVals, setEditQtyVals] = useState<Record<string, string>>({})

  const upsertQtyMut = useMutation({
    mutationFn: (data: { name: string; value: number; unitLabel?: string }) => propertiesApi.upsertQuantity(pid, uid, data),
    onSuccess: () => { refetchQty(); setAddingQty(false); setQtyForm({ name: '', value: '', unitLabel: '' }) },
  })
  const deleteQtyMut = useMutation({ mutationFn: (qid: string) => propertiesApi.deleteQuantity(pid, uid, qid), onSuccess: () => refetchQty() })

  // ─── Equipment state ─────────────────────────────────────
  const [showEqModal, setShowEqModal] = useState(false)
  const [eqForm, setEqForm] = useState<Record<string, string | boolean>>({ name: '', status: 'functional', quantity: '1', useInPrescription: true })
  const [editEqId, setEditEqId] = useState<string | null>(null)

  const createEqMut = useMutation({
    mutationFn: () => {
      const d: Record<string, unknown> = { name: eqForm.name, status: eqForm.status, quantity: parseFloat(eqForm.quantity as string) || 1, useInPrescription: eqForm.useInPrescription }
      if (eqForm.note) d.note = eqForm.note
      if (eqForm.serialNumber) d.serialNumber = eqForm.serialNumber
      if (eqForm.purchaseDate) d.purchaseDate = eqForm.purchaseDate
      if (eqForm.purchasePrice) d.purchasePrice = parseFloat(eqForm.purchasePrice as string)
      if (eqForm.installPrice) d.installPrice = parseFloat(eqForm.installPrice as string)
      if (eqForm.warranty) d.warranty = parseInt(eqForm.warranty as string, 10)
      if (eqForm.lifetime) d.lifetime = parseInt(eqForm.lifetime as string, 10)
      if (eqForm.rentDuring) d.rentDuring = parseFloat(eqForm.rentDuring as string)
      if (eqForm.description) d.description = eqForm.description
      return editEqId ? propertiesApi.updateEquipment(pid, uid, editEqId, d) : propertiesApi.createEquipment(pid, uid, d)
    },
    onSuccess: () => { refetchEq(); setShowEqModal(false); setEditEqId(null); setEqForm({ name: '', status: 'functional', quantity: '1', useInPrescription: true }) },
  })
  const deleteEqMut = useMutation({ mutationFn: (eqId: string) => propertiesApi.deleteEquipment(pid, uid, eqId), onSuccess: () => refetchEq() })

  // ─── Fees state ──────────────────────────────────────────
  const [addingFee, setAddingFee] = useState(false)
  const [feeForm, setFeeForm] = useState({ amount: '', calculationType: 'flat', validFrom: '', validTo: '' })
  const [editFeeId, setEditFeeId] = useState<string | null>(null)
  const [editFeeForm, setEditFeeForm] = useState<Record<string, string>>({})

  const createFeeMut = useMutation({
    mutationFn: () => propertiesApi.createFee(pid, uid, { amount: parseFloat(feeForm.amount), calculationType: feeForm.calculationType, validFrom: feeForm.validFrom, validTo: feeForm.validTo || null }),
    onSuccess: () => { refetchFees(); setAddingFee(false); setFeeForm({ amount: '', calculationType: 'flat', validFrom: '', validTo: '' }) },
  })
  const updateFeeMut = useMutation({
    mutationFn: (feeId: string) => propertiesApi.updateFee(pid, uid, feeId, {
      amount: parseFloat(editFeeForm.amount), calculationType: editFeeForm.calculationType, validFrom: editFeeForm.validFrom, validTo: editFeeForm.validTo || null,
    }),
    onSuccess: () => { refetchFees(); setEditFeeId(null) },
  })
  const deleteFeeMut = useMutation({ mutationFn: (feeId: string) => propertiesApi.deleteFee(pid, uid, feeId), onSuccess: () => refetchFees() })

  if (isLoading) return <LoadingState />
  if (error || !unit) return (
    <div>
      <button className="btn btn--sm" onClick={() => navigate(`/properties/${pid}`)} style={{ marginBottom: 16 }}><ArrowLeft size={14} /> Zpět</button>
      <ErrorState message="Jednotka nenalezena." />
    </div>
  )

  const spaceLabel = SPACE_LABELS[unit.spaceType ?? ''] ?? unit.spaceType ?? 'Jiný'
  const subtitle = [spaceLabel, unit.floor != null ? `${unit.floor}. NP` : null, unit.area != null ? `${unit.area} m²` : null].filter(Boolean).join(' · ')

  function goUnit(id: string | null | undefined) { if (id) navigate(`/properties/${pid}/units/${id}`) }

  function startEditRoom(r: ApiRoom) {
    setEditRoomId(r.id)
    setEditRoomForm({ name: r.name, area: String(r.area), coefficient: String(r.coefficient), roomType: r.roomType, includeTuv: r.includeTuv })
  }

  function startEditEq(e: ApiEquipment) {
    setEditEqId(e.id)
    setEqForm({
      name: e.name, status: e.status, note: e.note ?? '', quantity: String(e.quantity), serialNumber: e.serialNumber ?? '',
      purchaseDate: e.purchaseDate?.split('T')[0] ?? '', purchasePrice: e.purchasePrice != null ? String(e.purchasePrice) : '',
      installPrice: e.installPrice != null ? String(e.installPrice) : '', warranty: e.warranty != null ? String(e.warranty) : '',
      lifetime: e.lifetime != null ? String(e.lifetime) : '', rentDuring: e.rentDuring != null ? String(e.rentDuring) : '',
      description: e.description ?? '', useInPrescription: e.useInPrescription,
    })
    setShowEqModal(true)
  }

  function startEditFee(f: ApiFee) {
    setEditFeeId(f.id)
    setEditFeeForm({ amount: String(f.amount), calculationType: f.calculationType, validFrom: f.validFrom.split('T')[0], validTo: f.validTo?.split('T')[0] ?? '' })
  }

  const inp = { className: 'form-control', style: { padding: '4px 8px', fontSize: '.82rem' } } as const
  const numInp = { ...inp, type: 'number', step: 'any' } as const
  const dateInp = { ...inp, type: 'date' } as const

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 8, fontSize: '.82rem', color: 'var(--gray-400)' }}>
        <button onClick={() => navigate('/properties')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '.82rem', fontFamily: 'var(--font-body)' }}>Nemovitosti</button>
        <span style={{ margin: '0 6px' }}>/</span>
        <button onClick={() => navigate(`/properties/${pid}`)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '.82rem', fontFamily: 'var(--font-body)' }}>{property?.name ?? '...'}</button>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: 'var(--gray-600)' }}>{unit.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <button className="btn btn--sm" onClick={() => navigate(`/properties/${pid}`)} style={{ padding: '6px 10px' }}><ArrowLeft size={14} /></button>
            <h1 style={{ margin: 0 }}>Jednotka {unit.name}</h1>
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: '.9rem', margin: 0, paddingLeft: 44 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {nav && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
              <button className="btn btn--sm" disabled={!nav.prevId} onClick={() => goUnit(nav.prevId)} style={{ padding: '6px 8px' }}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: '.82rem', color: 'var(--gray-500)', minWidth: 60, textAlign: 'center' }}>{nav.current} z {nav.total}</span>
              <button className="btn btn--sm" disabled={!nav.nextId} onClick={() => goUnit(nav.nextId)} style={{ padding: '6px 8px' }}><ChevronRight size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(t => <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {/* ─── Obecné ──────────────────────────────────────────── */}
      {tab === 'general' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Card title={`Jednotka ${unit.name}`}>
            <FieldRow label="Ozn. dle KN" value={unit.knDesignation ?? unit.name} />
            <FieldRow label="Vlastní označení" value={unit.ownDesignation ?? <NA />} />
            <FieldRow label="Dispozice" value={unit.disposition ?? <NA />} />
            <FieldRow label="Podlaží" value={unit.floor != null ? `${unit.floor}. NP` : <NA />} />
            <FieldRow label="Podíl na spol. č.d." value={unit.commonAreaShare != null ? `${(Number(unit.commonAreaShare) * 100).toFixed(4)} %` : <NA />} />
            {unit.occupancies && unit.occupancies.length > 0 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--gray-600)', marginTop: 16, marginBottom: 8 }}>Aktuální vlastník</div>
                {unit.occupancies.filter((o: ApiOccupancy) => o.isActive && o.role === 'owner').map((o: ApiOccupancy) => (
                  <div key={o.id} style={{ fontSize: '.85rem' }}>
                    {o.resident?.isLegalEntity ? o.resident.companyName : `${o.resident?.firstName} ${o.resident?.lastName}`}
                    {o.ownershipShare != null && <span style={{ color: 'var(--gray-400)', marginLeft: 8 }}>({(o.ownershipShare * 100).toFixed(2)} %)</span>}
                  </div>
                ))}
              </>
            )}
          </Card>
          <Card title="Vlastnosti">
            <FieldRow label="Podlahová plocha" value={unit.area != null ? `${unit.area} m²` : <NA />} />
            <FieldRow label="Vytápěná plocha" value={unit.heatingArea != null ? `${unit.heatingArea} m²` : <NA />} />
            <FieldRow label="Plocha TÚV" value={unit.tuvArea != null ? `${unit.tuvArea} m²` : <NA />} />
            <FieldRow label="Typ prostoru" value={spaceLabel} />
            <FieldRow label="Počet osob" value={unit.personCount != null ? String(unit.personCount) : <NA />} />
            <FieldRow label="Výtah" value={unit.hasElevator != null ? (unit.hasElevator ? 'Ano' : 'Ne') : <NA />} />
            <FieldRow label="Způsob vytápění" value={unit.heatingMethod ?? <NA />} />
            <FieldRow label="Ext. pár. symbol" value={unit.extAllocatorRef ?? <NA />} />
          </Card>
        </div>
      )}

      {/* ─── TAB 1: PLOCHY (Rooms) ───────────────────────────── */}
      {tab === 'rooms' && (
        <Card title="Plochy" actions={<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setAddingRoom(true)}>Přidat</Button>}>
          <table className="tbl">
            <thead><tr>
              <th>Platnost</th><th>Název</th><th style={{ textAlign: 'right' }}>Evidovaná plocha</th><th style={{ textAlign: 'right' }}>Koef.</th>
              <th style={{ textAlign: 'right' }}>Započ. plocha</th><th style={{ textAlign: 'right' }}>Plocha TUV</th><th style={{ width: 80 }}>Akce</th>
            </tr></thead>
            <tbody>
              {addingRoom && (
                <tr>
                  <td><span className="badge badge--teal">od počátku</span></td>
                  <td><input {...inp} value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="Název" /></td>
                  <td><input {...numInp} value={roomForm.area} onChange={e => setRoomForm({ ...roomForm, area: e.target.value })} style={{ ...numInp.style, width: 80, textAlign: 'right' }} /></td>
                  <td><input {...numInp} value={roomForm.coefficient} onChange={e => setRoomForm({ ...roomForm, coefficient: e.target.value })} style={{ ...numInp.style, width: 70, textAlign: 'right' }} /></td>
                  <td style={{ textAlign: 'right', color: 'var(--gray-400)' }}>{((parseFloat(roomForm.area) || 0) * (parseFloat(roomForm.coefficient) || 1)).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--gray-400)' }}>{roomForm.includeTuv ? ((parseFloat(roomForm.area) || 0) * (parseFloat(roomForm.coefficient) || 1)).toFixed(2) : '0.00'}</td>
                  <td>
                    <button className="btn btn--sm" onClick={() => createRoomMut.mutate()} disabled={!roomForm.name || !roomForm.area} style={{ padding: '2px 6px', color: 'var(--success)' }}><Check size={14} /></button>
                    <button className="btn btn--sm" onClick={() => setAddingRoom(false)} style={{ padding: '2px 6px', color: 'var(--danger)' }}><X size={14} /></button>
                  </td>
                </tr>
              )}
              {rooms.map(r => editRoomId === r.id ? (
                <tr key={r.id}>
                  <td><span className="badge badge--teal">od počátku</span></td>
                  <td><input {...inp} value={editRoomForm.name as string} onChange={e => setEditRoomForm({ ...editRoomForm, name: e.target.value })} /></td>
                  <td><input {...numInp} value={editRoomForm.area as string} onChange={e => setEditRoomForm({ ...editRoomForm, area: e.target.value })} style={{ ...numInp.style, width: 80, textAlign: 'right' }} /></td>
                  <td><input {...numInp} value={editRoomForm.coefficient as string} onChange={e => setEditRoomForm({ ...editRoomForm, coefficient: e.target.value })} style={{ ...numInp.style, width: 70, textAlign: 'right' }} /></td>
                  <td style={{ textAlign: 'right', color: 'var(--gray-400)' }}>{((parseFloat(editRoomForm.area as string) || 0) * (parseFloat(editRoomForm.coefficient as string) || 1)).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{editRoomForm.includeTuv ? ((parseFloat(editRoomForm.area as string) || 0) * (parseFloat(editRoomForm.coefficient as string) || 1)).toFixed(2) : '0.00'}</td>
                  <td>
                    <button className="btn btn--sm" onClick={() => updateRoomMut.mutate(r.id)} style={{ padding: '2px 6px', color: 'var(--success)' }}><Check size={14} /></button>
                    <button className="btn btn--sm" onClick={() => setEditRoomId(null)} style={{ padding: '2px 6px', color: 'var(--danger)' }}><X size={14} /></button>
                  </td>
                </tr>
              ) : (
                <tr key={r.id}>
                  <td><ValidityBadge /></td>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td style={{ textAlign: 'right' }}>{r.area.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{r.coefficient.toFixed(3)}</td>
                  <td style={{ textAlign: 'right' }}>{(r.calculatedArea ?? r.area * r.coefficient).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{r.includeTuv ? (r.calculatedArea ?? r.area * r.coefficient).toFixed(2) : '0.00'}</td>
                  <td>
                    <button className="btn btn--sm" onClick={() => startEditRoom(r)} style={{ padding: '2px 6px' }}><Pencil size={12} /></button>
                    <button className="btn btn--sm" onClick={() => { if (confirm('Smazat?')) deleteRoomMut.mutate(r.id) }} style={{ padding: '2px 6px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            {rooms.length > 0 && (
              <tfoot><tr style={{ fontWeight: 700 }}>
                <td colSpan={2}>CELKEM</td>
                <td style={{ textAlign: 'right' }}>{rooms.reduce((s, r) => s + r.area, 0).toFixed(2)} m²</td>
                <td />
                <td style={{ textAlign: 'right' }}>{rooms.reduce((s, r) => s + (r.calculatedArea ?? r.area * r.coefficient), 0).toFixed(2)} m²</td>
                <td style={{ textAlign: 'right' }}>{rooms.filter(r => r.includeTuv).reduce((s, r) => s + (r.calculatedArea ?? r.area * r.coefficient), 0).toFixed(2)} m²</td>
                <td />
              </tr></tfoot>
            )}
          </table>
          {rooms.length === 0 && !addingRoom && <EmptyState title="Zatím žádné místnosti" description="Přidejte místnosti a plochy jednotky." />}
        </Card>
      )}

      {/* ─── TAB 2: VELIČINY (Quantities) ────────────────────── */}
      {tab === 'quantities' && (
        <Card title="Veličiny" actions={<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setAddingQty(true)}>Přidat</Button>}>
          <table className="tbl">
            <thead><tr><th>Veličina</th><th style={{ textAlign: 'right' }}>Hodnota</th><th>Jednotka</th><th style={{ width: 80 }}>Akce</th></tr></thead>
            <tbody>
              {addingQty && (
                <tr>
                  <td><input {...inp} value={qtyForm.name} onChange={e => setQtyForm({ ...qtyForm, name: e.target.value })} placeholder="Název veličiny" /></td>
                  <td><input {...numInp} value={qtyForm.value} onChange={e => setQtyForm({ ...qtyForm, value: e.target.value })} style={{ ...numInp.style, width: 100, textAlign: 'right' }} /></td>
                  <td><input {...inp} value={qtyForm.unitLabel} onChange={e => setQtyForm({ ...qtyForm, unitLabel: e.target.value })} placeholder="m², osob…" style={{ ...inp.style, width: 80 }} /></td>
                  <td>
                    <button className="btn btn--sm" onClick={() => upsertQtyMut.mutate({ name: qtyForm.name, value: parseFloat(qtyForm.value), unitLabel: qtyForm.unitLabel })} disabled={!qtyForm.name || !qtyForm.value} style={{ padding: '2px 6px', color: 'var(--success)' }}><Check size={14} /></button>
                    <button className="btn btn--sm" onClick={() => setAddingQty(false)} style={{ padding: '2px 6px', color: 'var(--danger)' }}><X size={14} /></button>
                  </td>
                </tr>
              )}
              {quantities.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 500 }}>{q.name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      {...numInp}
                      value={editQtyVals[q.id] ?? String(q.value)}
                      onChange={e => setEditQtyVals(prev => ({ ...prev, [q.id]: e.target.value }))}
                      onBlur={() => {
                        const v = parseFloat(editQtyVals[q.id] ?? '')
                        if (!isNaN(v) && v !== q.value) upsertQtyMut.mutate({ name: q.name, value: v, unitLabel: q.unitLabel })
                      }}
                      style={{ ...numInp.style, width: 100, textAlign: 'right' }}
                    />
                  </td>
                  <td>{q.unitLabel}</td>
                  <td>
                    <button className="btn btn--sm" onClick={() => { if (confirm('Smazat?')) deleteQtyMut.mutate(q.id) }} style={{ padding: '2px 6px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {quantities.length === 0 && !addingQty && <EmptyState title="Zatím žádné veličiny" description="Nastavte veličiny pro výpočty a vyúčtování." />}
        </Card>
      )}

      {/* ─── TAB 3: VYBAVENÍ (Equipment) ─────────────────────── */}
      {tab === 'equipment' && (
        <Card title="Vybavení" actions={<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => { setEditEqId(null); setEqForm({ name: '', status: 'functional', quantity: '1', useInPrescription: true }); setShowEqModal(true) }}>Přidat</Button>}>
          {equipment.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Platnost</th><th>Název</th><th style={{ textAlign: 'right' }}>Počet</th><th>Stav</th><th style={{ textAlign: 'right' }}>Cena poříz.</th><th style={{ width: 80 }}>Akce</th></tr></thead>
              <tbody>
                {equipment.map(e => (
                  <tr key={e.id}>
                    <td><ValidityBadge from={e.validFrom} to={e.validTo} /></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{e.name}</div>
                      {e.serialNumber && <div style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>SN: {e.serialNumber}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{e.quantity}</td>
                    <td>
                      <span className={`badge badge--${e.status === 'functional' ? 'green' : e.status === 'broken' ? 'red' : 'yellow'}`}>
                        {e.status === 'functional' ? 'funkční' : e.status === 'broken' ? 'nefunkční' : 'vyměněno'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{e.purchasePrice != null ? `${e.purchasePrice.toLocaleString('cs')} Kč` : <NA />}</td>
                    <td>
                      <button className="btn btn--sm" onClick={() => startEditEq(e)} style={{ padding: '2px 6px' }}><Pencil size={12} /></button>
                      <button className="btn btn--sm" onClick={() => { if (confirm('Smazat?')) deleteEqMut.mutate(e.id) }} style={{ padding: '2px 6px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="Zatím žádné vybavení" description="Evidujte vybavení jednotky." />}
        </Card>
      )}

      {/* Equipment Modal */}
      <Modal open={showEqModal} onClose={() => setShowEqModal(false)} title={editEqId ? 'Upravit vybavení' : 'Nové vybavení'} wide footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => setShowEqModal(false)}>Zavřít</Button>
          <Button variant="primary" onClick={() => createEqMut.mutate()} disabled={!(eqForm.name as string)}>Uložit</Button>
        </div>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: '.85rem' }}>
          <label>Název *<input {...inp} value={eqForm.name as string} onChange={e => setEqForm({ ...eqForm, name: e.target.value })} style={{ ...inp.style, marginTop: 4, width: '100%' }} /></label>
          <label>Výrobní číslo<input {...inp} value={(eqForm.serialNumber as string) ?? ''} onChange={e => setEqForm({ ...eqForm, serialNumber: e.target.value })} style={{ ...inp.style, marginTop: 4, width: '100%' }} /></label>
          <label>Stav
            <select {...inp} value={eqForm.status as string} onChange={e => setEqForm({ ...eqForm, status: e.target.value })} style={{ ...inp.style, marginTop: 4, width: '100%' }}>
              <option value="functional">Funkční</option><option value="broken">Nefunkční</option><option value="replaced">Vyměněno</option>
            </select>
          </label>
          <label>Počet kusů<input {...numInp} value={eqForm.quantity as string} onChange={e => setEqForm({ ...eqForm, quantity: e.target.value })} style={{ ...numInp.style, marginTop: 4, width: '100%' }} /></label>
          <label>Datum pořízení<input {...dateInp} value={(eqForm.purchaseDate as string) ?? ''} onChange={e => setEqForm({ ...eqForm, purchaseDate: e.target.value })} style={{ ...dateInp.style, marginTop: 4, width: '100%' }} /></label>
          <label>Použít v předpisu
            <select {...inp} value={eqForm.useInPrescription ? 'true' : 'false'} onChange={e => setEqForm({ ...eqForm, useInPrescription: e.target.value === 'true' })} style={{ ...inp.style, marginTop: 4, width: '100%' }}>
              <option value="true">Ano</option><option value="false">Ne</option>
            </select>
          </label>
          <label>Záruka (měsíců)<input {...numInp} value={(eqForm.warranty as string) ?? ''} onChange={e => setEqForm({ ...eqForm, warranty: e.target.value })} style={{ ...numInp.style, marginTop: 4, width: '100%' }} /></label>
          <label>Cena pořízení (Kč)<input {...numInp} value={(eqForm.purchasePrice as string) ?? ''} onChange={e => setEqForm({ ...eqForm, purchasePrice: e.target.value })} style={{ ...numInp.style, marginTop: 4, width: '100%' }} /></label>
          <label>Životnost (měsíců)<input {...numInp} value={(eqForm.lifetime as string) ?? ''} onChange={e => setEqForm({ ...eqForm, lifetime: e.target.value })} style={{ ...numInp.style, marginTop: 4, width: '100%' }} /></label>
          <label>Cena instalace (Kč)<input {...numInp} value={(eqForm.installPrice as string) ?? ''} onChange={e => setEqForm({ ...eqForm, installPrice: e.target.value })} style={{ ...numInp.style, marginTop: 4, width: '100%' }} /></label>
          <label>Nájem během živ. (Kč)<input {...numInp} value={(eqForm.rentDuring as string) ?? ''} onChange={e => setEqForm({ ...eqForm, rentDuring: e.target.value })} style={{ ...numInp.style, marginTop: 4, width: '100%' }} /></label>
          <div />
          <label style={{ gridColumn: '1 / -1' }}>Popis<textarea className="form-control" rows={2} value={(eqForm.description as string) ?? ''} onChange={e => setEqForm({ ...eqForm, description: e.target.value })} style={{ marginTop: 4, width: '100%', fontSize: '.82rem' }} /></label>
        </div>
      </Modal>

      {/* ─── TAB: Vlastníci (Owners) ─────────────────────────── */}
      {tab === 'owners' && (
        unit.occupancies && unit.occupancies.length > 0 ? (
          <div className="card">
            <table className="tbl">
              <thead><tr><th>Vlastník / nájemce</th><th>Role</th><th>Od</th><th>Do</th><th style={{ textAlign: 'right' }}>Podíl</th></tr></thead>
              <tbody>
                {unit.occupancies.map((o: ApiOccupancy) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500 }}>{o.resident?.isLegalEntity ? o.resident.companyName : `${o.resident?.firstName} ${o.resident?.lastName}`}</td>
                    <td><span className={`badge badge--${o.role === 'owner' ? 'blue' : o.role === 'tenant' ? 'green' : 'muted'}`}>{o.role === 'owner' ? 'vlastník' : o.role === 'tenant' ? 'nájemce' : 'člen'}</span></td>
                    <td>{fmtDate(o.startDate)}</td>
                    <td>{o.endDate ? fmtDate(o.endDate) : <span style={{ color: 'var(--gray-400)' }}>dosud</span>}</td>
                    <td style={{ textAlign: 'right' }}>{o.ownershipShare != null ? `${(o.ownershipShare * 100).toFixed(2)} %` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Zatím žádní vlastníci" description="Přidejte vlastníka nebo nájemce jednotky." />
      )}

      {/* ─── TAB 4: SLOŽKY PŘEDPISU ──────────────────────────── */}
      {tab === 'prescriptions' && (
        <Card title="Složky předpisu">
          {prescComps.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Platnost</th><th>Název složky</th><th>Typ výpočtu</th><th style={{ textAlign: 'right' }}>Částka/MJ</th></tr></thead>
              <tbody>
                {prescComps.map((a: ApiComponentAssignment) => (
                  <tr key={a.id}>
                    <td><ValidityBadge from={a.effectiveFrom} to={a.effectiveTo} /></td>
                    <td style={{ fontWeight: 500 }}>{a.component.name}{a.component.code && <span style={{ color: 'var(--gray-400)', marginLeft: 6, fontSize: '.78rem' }}>({a.component.code})</span>}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--gray-500)' }}>{a.component.calculationMethod}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {a.overrideAmount != null ? Number(a.overrideAmount).toLocaleString('cs') : Number(a.component.defaultAmount).toLocaleString('cs')} Kč
                      {a.overrideAmount != null && <span style={{ fontSize: '.7rem', color: 'var(--primary)', marginLeft: 4 }}>ind.</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="Žádné složky předpisu" description="Složky předpisu přiřazené k této jednotce se zobrazí zde." action={{ label: 'Otevřít složky', onClick: () => navigate('/finance?tab=components') }} />}
        </Card>
      )}

      {/* ─── TAB 5: MĚŘIDLA ──────────────────────────────────── */}
      {tab === 'meters' && (
        <Card title="Měřidla" actions={<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => navigate('/meters')}>Přidat</Button>}>
          {meters.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Platnost</th><th>Označení</th><th>Typ</th><th>Výrobní číslo</th><th style={{ textAlign: 'right' }}>Posl. odečet</th></tr></thead>
              <tbody>
                {meters.map((m: ApiMeter) => (
                  <tr key={m.id}>
                    <td>
                      <span className={`badge badge--${m.isActive ? 'green' : 'red'}`}>
                        {m.isActive ? (m.installDate ? `od ${fmtDate(m.installDate)}` : 'aktivní') : 'neaktivní'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>{METER_TYPE_LABELS[m.meterType] ?? m.meterType}</div>
                    </td>
                    <td style={{ fontSize: '.82rem' }}>{METER_TYPE_LABELS[m.meterType] ?? m.meterType}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{m.serialNumber}</td>
                    <td style={{ textAlign: 'right' }}>
                      {m.readings && m.readings.length > 0
                        ? <span>{m.readings[0].value} {m.unit}</span>
                        : <NA />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="Žádná měřidla" description="Měřidla přiřazená k této jednotce se zobrazí zde." action={{ label: 'Otevřít měřidla', onClick: () => navigate('/meters') }} />}
        </Card>
      )}

      {/* ─── TAB 6: SPRÁVNÍ ODMĚNA (Fees) ────────────────────── */}
      {tab === 'fees' && (
        <Card title="Správní odměna" actions={<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setAddingFee(true)}>Přidat</Button>}>
          <table className="tbl">
            <thead><tr><th>Typ</th><th style={{ textAlign: 'right' }}>Částka/měs.</th><th>Způsob výpočtu</th><th>Platnost od</th><th>Platnost do</th><th style={{ width: 80 }}>Akce</th></tr></thead>
            <tbody>
              {addingFee && (
                <tr>
                  <td>Správní odměna</td>
                  <td><input {...numInp} value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })} placeholder="Kč" style={{ ...numInp.style, width: 100, textAlign: 'right' }} /></td>
                  <td>
                    <select {...inp} value={feeForm.calculationType} onChange={e => setFeeForm({ ...feeForm, calculationType: e.target.value })}>
                      <option value="flat">Paušál</option><option value="per_area">Dle plochy</option><option value="per_person">Dle osob</option>
                    </select>
                  </td>
                  <td><input {...dateInp} value={feeForm.validFrom} onChange={e => setFeeForm({ ...feeForm, validFrom: e.target.value })} /></td>
                  <td><input {...dateInp} value={feeForm.validTo} onChange={e => setFeeForm({ ...feeForm, validTo: e.target.value })} /></td>
                  <td>
                    <button className="btn btn--sm" onClick={() => createFeeMut.mutate()} disabled={!feeForm.amount || !feeForm.validFrom} style={{ padding: '2px 6px', color: 'var(--success)' }}><Check size={14} /></button>
                    <button className="btn btn--sm" onClick={() => setAddingFee(false)} style={{ padding: '2px 6px', color: 'var(--danger)' }}><X size={14} /></button>
                  </td>
                </tr>
              )}
              {fees.map(f => editFeeId === f.id ? (
                <tr key={f.id}>
                  <td>Správní odměna</td>
                  <td><input {...numInp} value={editFeeForm.amount} onChange={e => setEditFeeForm({ ...editFeeForm, amount: e.target.value })} style={{ ...numInp.style, width: 100, textAlign: 'right' }} /></td>
                  <td>
                    <select {...inp} value={editFeeForm.calculationType} onChange={e => setEditFeeForm({ ...editFeeForm, calculationType: e.target.value })}>
                      <option value="flat">Paušál</option><option value="per_area">Dle plochy</option><option value="per_person">Dle osob</option>
                    </select>
                  </td>
                  <td><input {...dateInp} value={editFeeForm.validFrom} onChange={e => setEditFeeForm({ ...editFeeForm, validFrom: e.target.value })} /></td>
                  <td><input {...dateInp} value={editFeeForm.validTo} onChange={e => setEditFeeForm({ ...editFeeForm, validTo: e.target.value })} /></td>
                  <td>
                    <button className="btn btn--sm" onClick={() => updateFeeMut.mutate(f.id)} style={{ padding: '2px 6px', color: 'var(--success)' }}><Check size={14} /></button>
                    <button className="btn btn--sm" onClick={() => setEditFeeId(null)} style={{ padding: '2px 6px', color: 'var(--danger)' }}><X size={14} /></button>
                  </td>
                </tr>
              ) : (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>Správní odměna</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{f.amount.toLocaleString('cs')} Kč</td>
                  <td>{CALC_LABELS[f.calculationType] ?? f.calculationType}</td>
                  <td>{fmtDate(f.validFrom)}</td>
                  <td>{f.validTo ? fmtDate(f.validTo) : <span style={{ color: 'var(--gray-400)' }}>neomezeno</span>}</td>
                  <td>
                    <button className="btn btn--sm" onClick={() => startEditFee(f)} style={{ padding: '2px 6px' }}><Pencil size={12} /></button>
                    <button className="btn btn--sm" onClick={() => { if (confirm('Smazat?')) deleteFeeMut.mutate(f.id) }} style={{ padding: '2px 6px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fees.length === 0 && !addingFee && <EmptyState title="Zatím žádná správní odměna" description="Nastavte správní odměnu pro jednotku." />}
        </Card>
      )}

      {/* ─── Profil ──────────────────────────────────────────── */}
      {tab === 'profile' && (
        <Card title={`Profil jednotky ${unit.name}`}>
          <FieldRow label="Typ" value={spaceLabel} />
          <FieldRow label="Označení" value={unit.name} />
          <FieldRow label="Podlaží" value={unit.floor != null ? `${unit.floor}. NP` : <NA />} />
          <FieldRow label="Celková plocha" value={unit.area != null ? `${unit.area} m²` : <NA />} />
          <FieldRow label="Dispozice" value={unit.disposition ?? <NA />} />
          <FieldRow label="Počet osob" value={unit.personCount != null ? String(unit.personCount) : <NA />} />
          <FieldRow label="Obsazena" value={unit.isOccupied ? 'Ano' : 'Ne'} />
          <FieldRow label="Ext. pár. symbol" value={unit.extAllocatorRef ?? <NA />} />
          <FieldRow label="Vytvořeno" value={fmtDate(unit.createdAt)} />
          <FieldRow label="Naposledy upraveno" value={fmtDate(unit.updatedAt)} />
        </Card>
      )}
    </div>
  )
}
