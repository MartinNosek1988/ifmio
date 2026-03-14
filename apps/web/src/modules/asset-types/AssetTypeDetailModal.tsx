import { useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { Modal, Badge, Button, LoadingState, EmptyState } from '../../shared/components'
import {
  useAssetTypeAssignments, useCreateAssignment, useUpdateAssignment, useDeleteAssignment,
  useUpdateAssetType, useAssetTypePreview,
} from './api/asset-types.queries'
import { useRevisionTypes } from '../revisions/api/revisions.queries'
import type { ApiAssetType, ApiAssetTypeAssignment } from './api/asset-types.api'

interface Props {
  assetType: ApiAssetType
  onClose: () => void
}

type TabKey = 'info' | 'assignments' | 'preview'

export default function AssetTypeDetailModal({ assetType, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('assignments')
  const { data: assignments, isLoading: loadingAssignments } = useAssetTypeAssignments(assetType.id)
  const { data: types } = useRevisionTypes()
  const { data: preview } = useAssetTypePreview(assetType.id)
  const updateType = useUpdateAssetType()
  const createAssignment = useCreateAssignment()
  const updateAssignment = useUpdateAssignment()
  const deleteAssignment = useDeleteAssignment()

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ revisionTypeId: '', isRequired: true, note: '' })
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: assetType.name, code: assetType.code, category: assetType.category,
    description: assetType.description ?? '', isActive: assetType.isActive,
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const assignedTypeIds = new Set((assignments ?? []).map((a) => a.revisionTypeId))
  const availableTypes = (types ?? []).filter((t) => t.isActive && !assignedTypeIds.has(t.id))

  const handleAddAssignment = () => {
    if (!addForm.revisionTypeId) return
    createAssignment.mutate({
      assetTypeId: assetType.id,
      dto: {
        revisionTypeId: addForm.revisionTypeId,
        isRequired: addForm.isRequired,
        note: addForm.note || undefined,
      },
    }, {
      onSuccess: () => {
        setShowAdd(false)
        setAddForm({ revisionTypeId: '', isRequired: true, note: '' })
      },
    })
  }

  const handleSaveInfo = () => {
    updateType.mutate({ id: assetType.id, dto: {
      name: editForm.name,
      code: editForm.code,
      category: editForm.category,
      description: editForm.description || undefined,
      isActive: editForm.isActive,
    } }, {
      onSuccess: () => setEditing(false),
    })
  }

  const tabItems = [
    { key: 'assignments' as const, label: `Přiřazené činnosti (${assignments?.length ?? 0})` },
    { key: 'preview' as const, label: 'Náhled pravidel' },
    { key: 'info' as const, label: 'Nastavení' },
  ]

  return (
    <Modal open onClose={onClose} wide title={assetType.name}
      subtitle={`${assetType.code} · ${assetType.category}`}
      footer={<Button onClick={onClose}>Zavřít</Button>}
    >
      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabItems.map((t) => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Assignments Tab ─────────────────────────────────── */}
      {tab === 'assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Šablony činností</span>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(!showAdd)}>
              Přiřadit činnost
            </Button>
          </div>

          {showAdd && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="form-label">Šablona činnosti *</label>
                  <select value={addForm.revisionTypeId} onChange={(e) => setAddForm({ ...addForm, revisionTypeId: e.target.value })} style={inputStyle}>
                    <option value="">— Vyberte —</option>
                    {availableTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'end', gap: 6, paddingBottom: 2 }}>
                  <input type="checkbox" checked={addForm.isRequired} onChange={(e) => setAddForm({ ...addForm, isRequired: e.target.checked })} id="add-required" />
                  <label htmlFor="add-required" style={{ fontSize: '0.85rem' }}>Povinná</label>
                </div>
                <div>
                  <label className="form-label">Poznámka</label>
                  <input value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })} style={inputStyle} placeholder="Interní poznámka" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="primary" onClick={handleAddAssignment} disabled={createAssignment.isPending || !addForm.revisionTypeId}>
                  {createAssignment.isPending ? 'Ukládám...' : 'Přiřadit'}
                </Button>
                <Button size="sm" onClick={() => setShowAdd(false)}>Zrušit</Button>
              </div>
            </div>
          )}

          {loadingAssignments ? <LoadingState /> : !assignments?.length ? (
            <EmptyState title="Žádné činnosti" description="Přiřaďte šablony činností pro tento typ zařízení." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Činnost</th>
                  <th style={{ textAlign: 'center', padding: '6px 0' }} className="text-muted">Povinná</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Perioda</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Reminder</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Grace</th>
                  <th style={{ textAlign: 'center', padding: '6px 0' }} className="text-muted">Protokol</th>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Poznámka</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    assetTypeId={assetType.id}
                    onUpdate={updateAssignment}
                    onDelete={deleteAssignment}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Preview Tab ─────────────────────────────────────── */}
      {tab === 'preview' && (
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Efektivní pravidla po sloučení výchozích hodnot a přepsání:
          </div>
          {!preview?.length ? (
            <EmptyState title="Žádná pravidla" description="Přiřaďte činnosti v první záložce." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Činnost</th>
                  <th style={{ textAlign: 'center', padding: '6px 0' }} className="text-muted">Povinná</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Perioda</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Reminder</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Grace</th>
                  <th style={{ textAlign: 'center', padding: '6px 0' }} className="text-muted">Protokol</th>
                  <th style={{ textAlign: 'center', padding: '6px 0' }} className="text-muted">Podpisy</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.revisionTypeId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0' }}>
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      <span className="text-muted" style={{ fontSize: '0.78rem', marginLeft: 6 }}>{r.code}</span>
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>
                      <Badge variant={r.isRequired ? 'red' : 'muted'}>{r.isRequired ? 'Ano' : 'Ne'}</Badge>
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{r.effectiveIntervalDays}d</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{r.effectiveReminderDays}d</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{r.effectiveGraceDays}d</td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>
                      {r.effectiveRequiresProtocol ? <Badge variant="blue">Ano</Badge> : <span className="text-muted">Ne</span>}
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {r.effectiveRequiresSupplierSignature && <Badge variant="muted">D</Badge>}
                        {r.effectiveRequiresCustomerSignature && <Badge variant="muted">O</Badge>}
                        {!r.effectiveRequiresSupplierSignature && !r.effectiveRequiresCustomerSignature && <span className="text-muted">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Info Tab ────────────────────────────────────────── */}
      {tab === 'info' && (
        <div>
          {!editing ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <InfoField label="Název" value={assetType.name} />
                <InfoField label="Kód" value={assetType.code} />
                <InfoField label="Kategorie" value={assetType.category} />
                <InfoField label="Aktivní" value={assetType.isActive ? 'Ano' : 'Ne'} />
                <InfoField label="Výrobce (výchozí)" value={assetType.manufacturer ?? '—'} />
                <InfoField label="Model (výchozí)" value={assetType.model ?? '—'} />
              </div>
              {assetType.description && (
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)', marginBottom: 12 }}>
                  <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Popis</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{assetType.description}</div>
                </div>
              )}
              <Button size="sm" onClick={() => setEditing(true)}>Upravit</Button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Název</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Kód</label>
                  <input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Kategorie</label>
                  <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', alignItems: 'end', gap: 6, paddingBottom: 2 }}>
                  <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} id="edit-active" />
                  <label htmlFor="edit-active" style={{ fontSize: '0.85rem' }}>Aktivní</label>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Popis</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="primary" onClick={handleSaveInfo} disabled={updateType.isPending}>
                  {updateType.isPending ? 'Ukládám...' : 'Uložit'}
                </Button>
                <Button size="sm" onClick={() => setEditing(false)}>Zrušit</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

/* ─── Assignment Row with inline override editing ─────────────── */

function AssignmentRow({ assignment, assetTypeId, onUpdate, onDelete }: {
  assignment: ApiAssetTypeAssignment
  assetTypeId: string
  onUpdate: ReturnType<typeof useUpdateAssignment>
  onDelete: ReturnType<typeof useDeleteAssignment>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    intervalDaysOverride: assignment.intervalDaysOverride != null ? String(assignment.intervalDaysOverride) : '',
    reminderDaysOverride: assignment.reminderDaysOverride != null ? String(assignment.reminderDaysOverride) : '',
    graceDaysOverride: assignment.graceDaysOverride != null ? String(assignment.graceDaysOverride) : '',
    requiresProtocolOverride: assignment.requiresProtocolOverride,
    isRequired: assignment.isRequired,
    note: assignment.note ?? '',
  })

  const rt = assignment.revisionType
  const effectiveInterval = assignment.intervalDaysOverride ?? rt.defaultIntervalDays
  const effectiveReminder = assignment.reminderDaysOverride ?? rt.defaultReminderDaysBefore
  const effectiveGrace = assignment.graceDaysOverride ?? rt.graceDaysAfterEvent
  const effectiveProtocol = assignment.requiresProtocolOverride ?? rt.requiresProtocol

  const hasOverride = (val: unknown) => val != null

  const handleSave = () => {
    onUpdate.mutate({
      assetTypeId,
      assignmentId: assignment.id,
      dto: {
        isRequired: form.isRequired,
        intervalDaysOverride: form.intervalDaysOverride ? parseInt(form.intervalDaysOverride) : null,
        reminderDaysOverride: form.reminderDaysOverride ? parseInt(form.reminderDaysOverride) : null,
        graceDaysOverride: form.graceDaysOverride ? parseInt(form.graceDaysOverride) : null,
        requiresProtocolOverride: form.requiresProtocolOverride,
        note: form.note || null,
      },
    }, { onSuccess: () => setEditing(false) })
  }

  if (editing) {
    const s: React.CSSProperties = {
      width: 60, padding: '4px 6px', borderRadius: 4,
      border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
      color: 'var(--text)', textAlign: 'right', fontSize: '0.82rem',
    }
    return (
      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2, rgba(99,102,241,0.04))' }}>
        <td style={{ padding: '8px 0' }}>
          <span style={{ fontWeight: 600 }}>{rt.name}</span>
        </td>
        <td style={{ padding: '8px 0', textAlign: 'center' }}>
          <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />
        </td>
        <td style={{ padding: '8px 0', textAlign: 'right' }}>
          <input type="number" value={form.intervalDaysOverride} onChange={(e) => setForm({ ...form, intervalDaysOverride: e.target.value })} style={s} placeholder={String(rt.defaultIntervalDays)} min="1" />
        </td>
        <td style={{ padding: '8px 0', textAlign: 'right' }}>
          <input type="number" value={form.reminderDaysOverride} onChange={(e) => setForm({ ...form, reminderDaysOverride: e.target.value })} style={s} placeholder={String(rt.defaultReminderDaysBefore)} min="1" />
        </td>
        <td style={{ padding: '8px 0', textAlign: 'right' }}>
          <input type="number" value={form.graceDaysOverride} onChange={(e) => setForm({ ...form, graceDaysOverride: e.target.value })} style={s} placeholder={String(rt.graceDaysAfterEvent)} min="0" />
        </td>
        <td style={{ padding: '8px 0', textAlign: 'center' }}>
          <select
            value={form.requiresProtocolOverride == null ? '' : form.requiresProtocolOverride ? 'true' : 'false'}
            onChange={(e) => setForm({ ...form, requiresProtocolOverride: e.target.value === '' ? null : e.target.value === 'true' })}
            style={{ ...s, width: 70, textAlign: 'left' }}
          >
            <option value="">Výchozí</option>
            <option value="true">Ano</option>
            <option value="false">Ne</option>
          </select>
        </td>
        <td style={{ padding: '8px 0' }}>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...s, width: '100%', textAlign: 'left' }} placeholder="Poznámka" />
        </td>
        <td style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 4 }} title="Uložit">
              <Check size={14} />
            </button>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }} title="Zrušit">
              <X size={14} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onDoubleClick={() => setEditing(true)}>
      <td style={{ padding: '8px 0' }}>
        <span style={{ fontWeight: 600 }}>{rt.name}</span>
        <span className="text-muted" style={{ fontSize: '0.78rem', marginLeft: 6 }}>{rt.code}</span>
      </td>
      <td style={{ padding: '8px 0', textAlign: 'center' }}>
        <Badge variant={assignment.isRequired ? 'red' : 'muted'}>{assignment.isRequired ? 'Ano' : 'Ne'}</Badge>
      </td>
      <td style={{ padding: '8px 0', textAlign: 'right' }}>
        <span style={{ fontWeight: hasOverride(assignment.intervalDaysOverride) ? 700 : 400 }}>{effectiveInterval}d</span>
      </td>
      <td style={{ padding: '8px 0', textAlign: 'right' }}>
        <span style={{ fontWeight: hasOverride(assignment.reminderDaysOverride) ? 700 : 400 }}>{effectiveReminder}d</span>
      </td>
      <td style={{ padding: '8px 0', textAlign: 'right' }}>
        <span style={{ fontWeight: hasOverride(assignment.graceDaysOverride) ? 700 : 400 }}>{effectiveGrace}d</span>
      </td>
      <td style={{ padding: '8px 0', textAlign: 'center' }}>
        {effectiveProtocol ? <Badge variant="blue">Ano</Badge> : <span className="text-muted">Ne</span>}
      </td>
      <td style={{ padding: '8px 0', fontSize: '0.8rem' }} className="text-muted">
        {assignment.note || '—'}
      </td>
      <td style={{ padding: '8px 0' }}>
        <button
          onClick={() => onDelete.mutate({ assetTypeId, assignmentId: assignment.id })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
          title="Odebrat"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

/* ─── Helpers ──────────────────────────────────────────────────── */

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
