import { useState } from 'react'
import { Modal, Button } from '../../shared/components'
import { useCreateRevisionPlan, useRevisionSubjects, useRevisionTypes } from './api/revisions.queries'
import { useProperties } from '../properties/use-properties'

interface Props { onClose: () => void }

export default function RevisionPlanForm({ onClose }: Props) {
  const createMutation = useCreateRevisionPlan()
  const { data: subjects } = useRevisionSubjects()
  const { data: types } = useRevisionTypes()
  const { data: properties } = useProperties()

  const [form, setForm] = useState({
    title: '',
    revisionSubjectId: '',
    revisionTypeId: '',
    propertyId: '',
    intervalDays: '365',
    reminderDaysBefore: '30',
    vendorName: '',
    description: '',
    nextDueAt: '',
    isMandatory: true,
  })

  const handleSubmit = () => {
    if (!form.title.trim() || !form.revisionSubjectId || !form.revisionTypeId) return
    createMutation.mutate({
      title: form.title.trim(),
      revisionSubjectId: form.revisionSubjectId,
      revisionTypeId: form.revisionTypeId,
      propertyId: form.propertyId || undefined,
      intervalDays: parseInt(form.intervalDays) || 365,
      reminderDaysBefore: parseInt(form.reminderDaysBefore) || 30,
      vendorName: form.vendorName || undefined,
      description: form.description || undefined,
      nextDueAt: form.nextDueAt || undefined,
      isMandatory: form.isMandatory,
    }, { onSuccess: onClose })
  }

  // Auto-fill interval from type
  const handleTypeChange = (typeId: string) => {
    const type = types?.find((t) => t.id === typeId)
    setForm({
      ...form,
      revisionTypeId: typeId,
      ...(type ? {
        intervalDays: String(type.defaultIntervalDays),
        reminderDaysBefore: String(type.defaultReminderDaysBefore),
      } : {}),
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const activeSubjects = (subjects ?? []).filter((s) => s.isActive)
  const activeTypes = (types ?? []).filter((t) => t.isActive)

  return (
    <Modal
      open onClose={onClose}
      title="Nový plán revize"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !form.title.trim() || !form.revisionSubjectId || !form.revisionTypeId}
          >
            {createMutation.isPending ? 'Vytvářím...' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Název *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="Název plánu revize" />
        </div>
        <div>
          <label className="form-label">Předmět revize *</label>
          <select value={form.revisionSubjectId} onChange={(e) => setForm({ ...form, revisionSubjectId: e.target.value })} style={inputStyle}>
            <option value="">Vyberte...</option>
            {activeSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.property ? ` (${s.property.name})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Typ revize *</label>
          <select value={form.revisionTypeId} onChange={(e) => handleTypeChange(e.target.value)} style={inputStyle}>
            <option value="">Vyberte...</option>
            {activeTypes.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Objekt</label>
          <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} style={inputStyle}>
            <option value="">Z předmětu revize</option>
            {(properties ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Interval (dní)</label>
          <input type="number" value={form.intervalDays} onChange={(e) => setForm({ ...form, intervalDays: e.target.value })} style={inputStyle} min="1" />
        </div>
        <div>
          <label className="form-label">Reminder (dní předem)</label>
          <input type="number" value={form.reminderDaysBefore} onChange={(e) => setForm({ ...form, reminderDaysBefore: e.target.value })} style={inputStyle} min="1" />
        </div>
        <div>
          <label className="form-label">Další termín</label>
          <input type="date" value={form.nextDueAt} onChange={(e) => setForm({ ...form, nextDueAt: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label className="form-label">Dodavatel</label>
          <input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} style={inputStyle} placeholder="Dodavatel revize" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Popis</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isMandatory} onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })} />
            Povinná revize
          </label>
        </div>
      </div>

      {createMutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>Nepodařilo se vytvořit plán.</div>
      )}
    </Modal>
  )
}
