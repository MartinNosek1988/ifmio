import { useState } from 'react'
import { Modal, Button } from '../../shared/components'
import { useAddAgendaItem, useUpdateAgendaItem } from './lib/assemblyApi'
import { MAJORITY_LABELS, type AgendaItem, type MajorityType } from './lib/assemblyTypes'

interface Props {
  assemblyId: string
  item?: AgendaItem
  onClose: () => void
}

export default function AgendaItemForm({ assemblyId, item, onClose }: Props) {
  const isEdit = !!item
  const addMut = useAddAgendaItem()
  const updateMut = useUpdateAgendaItem()
  const isPending = addMut.isPending || updateMut.isPending

  const [form, setForm] = useState({
    title: item?.title ?? '',
    description: item?.description ?? '',
    requiresVote: item?.requiresVote ?? true,
    majorityType: (item?.majorityType ?? 'NADPOLOVICNI_PRITOMNYCH') as MajorityType,
    notes: item?.notes ?? '',
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = () => {
    if (!form.title.trim()) return
    const data = {
      title: form.title,
      description: form.description || undefined,
      requiresVote: form.requiresVote,
      majorityType: form.majorityType,
      notes: form.notes || undefined,
    }
    if (isEdit) {
      updateMut.mutate({ assemblyId, itemId: item!.id, data }, { onSuccess: () => onClose() })
    } else {
      addMut.mutate({ assemblyId, data }, { onSuccess: () => onClose() })
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box',
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit bod programu' : 'Přidat bod programu'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending || !form.title.trim()}>
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Přidat'}
          </Button>
        </div>
      }>
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název bodu *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} placeholder="Schválení účetní závěrky za rok 2025" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis / návrh usnesení</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Vyžaduje hlasování</label>
          <select value={String(form.requiresVote)} onChange={e => set('requiresVote', e.target.value === 'true')} style={inputStyle}>
            <option value="true">Ano</option>
            <option value="false">Ne (informační bod)</option>
          </select>
        </div>
        {form.requiresVote && (
          <div>
            <label className="form-label">Typ většiny</label>
            <select value={form.majorityType} onChange={e => set('majorityType', e.target.value)} style={inputStyle}>
              {(Object.entries(MAJORITY_LABELS) as [MajorityType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="form-label">Poznámky</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
    </Modal>
  )
}
