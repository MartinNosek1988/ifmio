import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, Modal } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useAllocationSummary, useCreateAllocation, useUpdateAllocation, useDeleteAllocation } from '../api/finance.queries'
import { usePropertyComponents } from '../api/components.queries'
import { useEvidenceFolders, useInvoiceEvidenceAllocations, useCreateEvidenceAllocation, useDeleteEvidenceAllocation } from '../evidence-folders/evidence-folders.queries'
import { useProperty } from '../../properties/use-properties'
import { useUnitOwnershipsByProperty } from '../../properties/ownerships-api'
import { formatKc } from '../../../shared/utils/format'
import type { ApiAllocation } from '../api/finance.api'
import type { ApiEvidenceAllocation } from '../evidence-folders/evidence-folders.api'

const TYPE_LABELS: Record<string, string> = {
  ADVANCE: 'Záloha', FLAT_FEE: 'Paušál', FUND: 'Fond oprav',
  RENT: 'Nájem', DEPOSIT: 'Kauce', ANNUITY: 'Anuita', ACCESSORY: 'Příslušenství', OTHER: 'Ostatní',
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  unallocated: { color: '#ef4444', label: 'Nealokováno' },
  partial: { color: '#f97316', label: 'Částečně alokováno' },
  allocated: { color: '#22c55e', label: 'Plně alokováno' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
  color: 'var(--text)', boxSizing: 'border-box', fontSize: '.85rem',
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)' }

interface Props {
  invoiceId: string
  propertyId?: string | null
  readOnly?: boolean
}

type TargetMode = '' | 'owner' | 'units'

interface FormState {
  componentId: string
  amount: string
  year: string
  note: string
  targetMode: TargetMode
  targetOwnerId: string
  unitIdsText: string
  periodFrom: string
  periodTo: string
  consumption: string
  consumptionUnit: string
}

function defaultPeriod(year: string) {
  const y = parseInt(year, 10) || new Date().getFullYear()
  return { periodFrom: `${y}-01-01`, periodTo: `${y}-12-31` }
}

function targetLabel(a: ApiAllocation, ownerships: any[]): string {
  if (a.targetOwnerId) {
    const owner = ownerships.find((o: any) => o.partyId === a.targetOwnerId)
    return owner?.party?.displayName ?? `Vlastník: ${a.targetOwnerId.slice(0, 8)}…`
  }
  if (a.unitIds.length > 0) return `${a.unitIds.length} jednotek`
  return 'Vše'
}

function consumptionLabel(a: ApiAllocation): string {
  if (a.consumption != null) return `${a.consumption} ${a.consumptionUnit ?? ''}`
  return ''
}

export function AllocationPanel({ invoiceId, propertyId, readOnly }: Props) {
  const toast = useToast()
  const { data: summary, isLoading } = useAllocationSummary(invoiceId)
  const { data: components = [] } = usePropertyComponents(propertyId || undefined, true)
  const createMut = useCreateAllocation()
  const updateMut = useUpdateAllocation()
  const deleteMut = useDeleteAllocation()

  // Property data for owner/unit selects
  const { data: propertyData } = useProperty(propertyId || '')
  const propertyUnits = propertyData?.units ?? []
  const { data: unitOwnerships = [] } = useUnitOwnershipsByProperty(propertyId || '')

  // Evidence allocations
  const { data: evidAllocations = [] } = useInvoiceEvidenceAllocations(invoiceId)
  const { data: evidFolders = [] } = useEvidenceFolders(propertyId || undefined)
  const createEvidMut = useCreateEvidenceAllocation()
  const deleteEvidMut = useDeleteEvidenceAllocation()
  const [showEvidForm, setShowEvidForm] = useState(false)
  const [evidForm, setEvidForm] = useState({ evidenceFolderId: '', amount: '', year: String(new Date().getFullYear()), note: '' })

  const [showForm, setShowForm] = useState(false)
  const [editAlloc, setEditAlloc] = useState<ApiAllocation | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const currentYear = String(new Date().getFullYear())
  const emptyForm: FormState = {
    componentId: '', amount: '', year: currentYear, note: '',
    targetMode: '', targetOwnerId: '', unitIdsText: '',
    ...defaultPeriod(currentYear), consumption: '', consumptionUnit: '',
  }
  const [form, setForm] = useState<FormState>(emptyForm)

  const set = (key: keyof FormState, value: string) => {
    setForm(f => {
      const next = { ...f, [key]: value }
      // Auto-update period when year changes
      if (key === 'year') {
        const dp = defaultPeriod(value)
        next.periodFrom = dp.periodFrom
        next.periodTo = dp.periodTo
      }
      return next
    })
  }

  const openCreate = () => {
    setEditAlloc(null)
    setShowAdvanced(false)
    setForm({
      ...emptyForm,
      amount: summary ? String(summary.remainingAmount) : '',
    })
    setShowForm(true)
  }

  const openEdit = (a: ApiAllocation) => {
    setEditAlloc(a)
    const tm: TargetMode = a.targetOwnerId ? 'owner' : a.unitIds.length > 0 ? 'units' : ''
    const hasAdvanced = !!(a.periodFrom || a.periodTo || a.consumption != null)
    setShowAdvanced(hasAdvanced)
    setForm({
      componentId: a.componentId,
      amount: String(a.amount),
      year: a.year != null ? String(a.year) : currentYear,
      note: a.note ?? '',
      targetMode: tm,
      targetOwnerId: a.targetOwnerId ?? '',
      unitIdsText: a.unitIds.join(', '),
      periodFrom: a.periodFrom?.slice(0, 10) ?? defaultPeriod(a.year != null ? String(a.year) : currentYear).periodFrom,
      periodTo: a.periodTo?.slice(0, 10) ?? defaultPeriod(a.year != null ? String(a.year) : currentYear).periodTo,
      consumption: a.consumption != null ? String(a.consumption) : '',
      consumptionUnit: a.consumptionUnit ?? '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.componentId || !form.amount) { toast.error('Vyplňte složku a částku.'); return }
    const dto: Record<string, unknown> = {
      componentId: form.componentId,
      amount: parseFloat(form.amount),
      year: form.year ? parseInt(form.year, 10) : undefined,
      note: form.note || undefined,
    }

    // Target — explicitly clear unused fields
    if (form.targetMode === 'owner' && form.targetOwnerId) {
      dto.targetOwnerId = form.targetOwnerId
      dto.unitIds = []
    } else if (form.targetMode === 'units' && form.unitIdsText.trim()) {
      dto.unitIds = form.unitIdsText.split(',').map(s => s.trim()).filter(Boolean)
      dto.targetOwnerId = null
    } else {
      dto.targetOwnerId = null
      dto.unitIds = []
    }

    // Advanced fields
    if (showAdvanced) {
      if (form.periodFrom) dto.periodFrom = form.periodFrom
      if (form.periodTo) dto.periodTo = form.periodTo
      if (form.consumption) dto.consumption = parseFloat(form.consumption)
      if (form.consumptionUnit) dto.consumptionUnit = form.consumptionUnit
    }

    try {
      if (editAlloc) {
        await updateMut.mutateAsync({ invoiceId, allocationId: editAlloc.id, dto })
        toast.success('Alokace upravena.')
      } else {
        await createMut.mutateAsync({ invoiceId, dto })
        toast.success('Alokace přidána.')
      }
      setShowForm(false)
    } catch {
      toast.error('Uložení se nezdařilo.')
    }
  }

  const handleDelete = async (a: ApiAllocation) => {
    if (!confirm('Smazat alokaci?')) return
    try {
      await deleteMut.mutateAsync({ invoiceId, allocationId: a.id })
      toast.success('Alokace smazána.')
    } catch {
      toast.error('Smazání se nezdařilo.')
    }
  }

  if (isLoading || !summary) return null

  const sc = STATUS_CONFIG[summary.allocationStatus] ?? STATUS_CONFIG.unallocated
  const evidTotal = evidAllocations.reduce((s: number, a: ApiEvidenceAllocation) => s + a.amount, 0)

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Složky předpisu
        </div>
        {!readOnly && (
          <Button size="sm" icon={<Plus size={12} />} onClick={openCreate}>Přidat</Button>
        )}
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--surface-2, var(--surface))', marginBottom: 10, fontSize: '.85rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color }} />
        <span style={{ fontWeight: 500 }}>
          Alokováno: {formatKc(summary.allocatedAmount + evidTotal)} / {formatKc(summary.totalAmount)}
          {evidTotal > 0 && <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginLeft: 4 }}>(složky: {formatKc(summary.allocatedAmount)}, evid.: {formatKc(evidTotal)})</span>}
        </span>
        <Badge variant={summary.allocationStatus === 'allocated' ? 'green' : summary.allocationStatus === 'partial' ? 'yellow' : 'red'}>
          {sc.label}
        </Badge>
        {summary.remainingAmount > 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>
            (zbývá {formatKc(summary.remainingAmount)})
          </span>
        )}
      </div>

      {/* Allocations table */}
      {summary.allocations.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={thStyle}>Složka</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Částka</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Rok</th>
              <th style={thStyle}>Cíl</th>
              <th style={thStyle}>Spotřeba</th>
              {!readOnly && <th style={{ width: 60, padding: '6px 8px' }} />}
            </tr>
          </thead>
          <tbody>
            {summary.allocations.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{ fontWeight: 500 }}>{a.component.name}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                    ({TYPE_LABELS[a.component.componentType] ?? a.component.componentType})
                  </span>
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px', fontFamily: 'monospace' }}>{formatKc(a.amount)}</td>
                <td style={{ textAlign: 'center', padding: '6px 8px' }}>{a.year ?? '—'}</td>
                <td style={{ padding: '6px 8px', fontSize: '.8rem', color: 'var(--text-muted)' }}>{targetLabel(a, unitOwnerships)}</td>
                <td style={{ padding: '6px 8px', fontSize: '.8rem', color: 'var(--text-muted)' }}>{consumptionLabel(a)}</td>
                {!readOnly && (
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    <button className="btn btn--sm" onClick={() => openEdit(a)} style={{ padding: '2px 4px' }}><Pencil size={12} /></button>
                    <button className="btn btn--sm" onClick={() => handleDelete(a)} style={{ padding: '2px 4px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Form modal */}
      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title={editAlloc ? 'Upravit alokaci' : 'Přidat do složky'} footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowForm(false)}>Zrušit</Button>
            <Button variant="primary" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending || !form.componentId}>
              {createMut.isPending || updateMut.isPending ? 'Ukládám…' : 'Uložit'}
            </Button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Složka */}
            <div>
              <label className="form-label">Složka předpisu *</label>
              <select value={form.componentId} onChange={e => set('componentId', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— vyberte —</option>
                {components.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({TYPE_LABELS[c.componentType] ?? c.componentType})</option>
                ))}
              </select>
            </div>

            {/* Částka */}
            <div>
              <label className="form-label">Částka (Kč) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} style={inputStyle} />
              {summary.remainingAmount > 0 && !editAlloc && (
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Zbývá k alokaci: {formatKc(summary.remainingAmount)}
                </div>
              )}
            </div>

            {/* Rok */}
            <div>
              <label className="form-label">Hospodářský rok</label>
              <input type="number" value={form.year} onChange={e => set('year', e.target.value)} style={inputStyle} />
            </div>

            {/* Cíl nákladu */}
            <div>
              <label className="form-label">Cíl nákladu</label>
              <select value={form.targetMode} onChange={e => set('targetMode', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Všechny jednotky složky</option>
                <option value="owner">Konkrétní vlastník</option>
                <option value="units">Konkrétní jednotky</option>
              </select>
            </div>

            {form.targetMode === 'owner' && (
              <div>
                <label className="form-label">Vlastník</label>
                <select value={form.targetOwnerId} onChange={e => set('targetOwnerId', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">— vyberte vlastníka —</option>
                  {unitOwnerships.map((o: any) => (
                    <option key={o.id} value={o.partyId}>
                      {o.party?.displayName ?? '—'}{o.unit ? ` (${o.unit.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.targetMode === 'units' && (
              <div>
                <label className="form-label">Jednotky</label>
                <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8, maxHeight: 160, overflow: 'auto' }}>
                  {propertyUnits.length === 0 && <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Žádné jednotky</div>}
                  {propertyUnits.map((u: any) => {
                    const selected = form.unitIdsText.split(',').map(s => s.trim()).includes(u.id)
                    return (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: '.84rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selected} onChange={() => {
                          const ids = form.unitIdsText.split(',').map(s => s.trim()).filter(Boolean)
                          const next = selected ? ids.filter(id => id !== u.id) : [...ids, u.id]
                          set('unitIdsText', next.join(', '))
                        }} />
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>
                          {u.spaceType === 'RESIDENTIAL' ? 'bytový' : u.spaceType === 'NON_RESIDENTIAL' ? 'nebytový' : u.spaceType?.toLowerCase() ?? ''}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Poznámka */}
            <div>
              <label className="form-label">Poznámka</label>
              <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Rozšířené nastavení */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ background: 'none', border: 'none', color: 'var(--primary, #3b82f6)', cursor: 'pointer', fontSize: '.82rem', padding: 0 }}
              >
                Rozšířené nastavení {showAdvanced ? '▴' : '▾'}
              </button>
            </div>

            {showAdvanced && (
              <>
                {/* Období */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Období od</label>
                    <input type="date" value={form.periodFrom} onChange={e => set('periodFrom', e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Období do</label>
                    <input type="date" value={form.periodTo} onChange={e => set('periodTo', e.target.value)} style={inputStyle} />
                  </div>
                </div>

                {/* Spotřeba */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 3 }}>
                    <label className="form-label">Spotřeba</label>
                    <input type="number" min="0" step="0.0001" value={form.consumption} onChange={e => set('consumption', e.target.value)} placeholder="0" style={inputStyle} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label className="form-label">Jednotka</label>
                    <input value={form.consumptionUnit} onChange={e => set('consumptionUnit', e.target.value)} placeholder="m³, kWh, GJ…" style={inputStyle} />
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ─── Evidence Allocations Section ────────────────────── */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Evidenční složky
          </div>
          {!readOnly && (
            <Button size="sm" icon={<Plus size={12} />} onClick={() => {
              setEvidForm({ evidenceFolderId: '', amount: summary ? String(summary.remainingAmount - evidAllocations.reduce((s, a) => s + a.amount, 0)) : '', year: String(new Date().getFullYear()), note: '' })
              setShowEvidForm(true)
            }}>Přidat</Button>
          )}
        </div>
        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>
          Evidenční náklady nevstupují do vyúčtování vlastníků.
        </div>

        {evidAllocations.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>Složka</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Částka</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Rok</th>
                <th style={thStyle}>Pozn.</th>
                {!readOnly && <th style={{ width: 40, padding: '6px 8px' }} />}
              </tr>
            </thead>
            <tbody>
              {evidAllocations.map((a: ApiEvidenceAllocation) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>
                    {a.evidenceFolder.color && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: a.evidenceFolder.color, marginRight: 6 }} />}
                    <span style={{ fontWeight: 500 }}>{a.evidenceFolder.name}</span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontFamily: 'monospace' }}>{formatKc(a.amount)}</td>
                  <td style={{ textAlign: 'center', padding: '6px 8px' }}>{a.year ?? '—'}</td>
                  <td style={{ padding: '6px 8px', fontSize: '.8rem', color: 'var(--text-muted)' }}>{a.note ?? ''}</td>
                  {!readOnly && (
                    <td style={{ padding: '6px 8px' }}>
                      <button className="btn btn--sm" onClick={() => {
                        if (confirm('Smazat?')) deleteEvidMut.mutate({ invoiceId, allocationId: a.id })
                      }} style={{ padding: '2px 4px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Evidence form modal */}
      {showEvidForm && (
        <Modal open onClose={() => setShowEvidForm(false)} title="Přidat do evidenční složky" footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowEvidForm(false)}>Zrušit</Button>
            <Button variant="primary" onClick={async () => {
              if (!evidForm.evidenceFolderId || !evidForm.amount) return
              try {
                await createEvidMut.mutateAsync({ invoiceId, dto: {
                  evidenceFolderId: evidForm.evidenceFolderId,
                  amount: parseFloat(evidForm.amount),
                  year: evidForm.year ? parseInt(evidForm.year, 10) : undefined,
                  note: evidForm.note || undefined,
                }})
                setShowEvidForm(false)
              } catch {}
            }} disabled={createEvidMut.isPending || !evidForm.evidenceFolderId}>
              {createEvidMut.isPending ? 'Ukládám…' : 'Uložit'}
            </Button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">Evidenční složka *</label>
              <select value={evidForm.evidenceFolderId} onChange={e => setEvidForm(f => ({ ...f, evidenceFolderId: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— vyberte —</option>
                {evidFolders.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}{f.code ? ` (${f.code})` : ''}</option>
                ))}
              </select>
              {evidFolders.length === 0 && (
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Nejprve vytvořte evidenční složky v záložce Finance → Evidenční složky.
                </div>
              )}
            </div>
            <div>
              <label className="form-label">Částka (Kč) *</label>
              <input type="number" min="0" step="0.01" value={evidForm.amount} onChange={e => setEvidForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Rok</label>
              <input type="number" value={evidForm.year} onChange={e => setEvidForm(f => ({ ...f, year: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Poznámka</label>
              <textarea value={evidForm.note} onChange={e => setEvidForm(f => ({ ...f, note: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
