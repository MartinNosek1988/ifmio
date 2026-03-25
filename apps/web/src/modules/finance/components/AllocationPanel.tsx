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

interface Props {
  invoiceId: string
  propertyId?: string | null
  readOnly?: boolean
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
  const [form, setForm] = useState({
    componentId: '', amount: '', year: String(new Date().getFullYear()), note: '',
  })

  const openCreate = () => {
    setEditAlloc(null)
    setForm({
      componentId: '',
      amount: summary ? String(summary.remainingAmount) : '',
      year: String(new Date().getFullYear()),
      note: '',
    })
    setShowForm(true)
  }

  const openEdit = (a: ApiAllocation) => {
    setEditAlloc(a)
    setForm({
      componentId: a.componentId,
      amount: String(a.amount),
      year: a.year != null ? String(a.year) : String(new Date().getFullYear()),
      note: a.note ?? '',
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
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)' }}>Složka</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)' }}>Částka</th>
              <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)' }}>Rok</th>
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
            <div>
              <label className="form-label">Složka předpisu *</label>
              <select value={form.componentId} onChange={e => setForm(f => ({ ...f, componentId: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— vyberte —</option>
                {components.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({TYPE_LABELS[c.componentType] ?? c.componentType})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Částka (Kč) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} />
              {summary.remainingAmount > 0 && !editAlloc && (
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Zbývá k alokaci: {formatKc(summary.remainingAmount)}
                </div>
              )}
            </div>
            <div>
              <label className="form-label">Hospodářský rok</label>
              <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Poznámka</label>
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
