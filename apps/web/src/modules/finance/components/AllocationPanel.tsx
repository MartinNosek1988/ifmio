import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, Modal } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useAllocationSummary, useCreateAllocation, useUpdateAllocation, useDeleteAllocation } from '../api/finance.queries'
import { usePropertyComponents } from '../api/components.queries'
import { formatKc } from '../../../shared/utils/format'
import type { ApiAllocation } from '../api/finance.api'

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

function targetLabel(a: ApiAllocation): string {
  if (a.targetOwnerId) return `Vlastník: ${a.targetOwnerId.slice(0, 8)}…`
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

    // Target
    if (form.targetMode === 'owner' && form.targetOwnerId) {
      dto.targetOwnerId = form.targetOwnerId
      dto.unitIds = []
    } else if (form.targetMode === 'units' && form.unitIdsText.trim()) {
      dto.unitIds = form.unitIdsText.split(',').map(s => s.trim()).filter(Boolean)
      dto.targetOwnerId = undefined
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
          Alokováno: {formatKc(summary.allocatedAmount)} / {formatKc(summary.totalAmount)}
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
                <td style={{ padding: '6px 8px', fontSize: '.8rem', color: 'var(--text-muted)' }}>{targetLabel(a)}</td>
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
                <label className="form-label">ID vlastníka</label>
                <input value={form.targetOwnerId} onChange={e => set('targetOwnerId', e.target.value)} placeholder="ID vlastníka (Party)" style={inputStyle} />
              </div>
            )}

            {form.targetMode === 'units' && (
              <div>
                <label className="form-label">IDs jednotek (oddělené čárkou)</label>
                <input value={form.unitIdsText} onChange={e => set('unitIdsText', e.target.value)} placeholder="unit-id-1, unit-id-2" style={inputStyle} />
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
    </div>
  )
}
