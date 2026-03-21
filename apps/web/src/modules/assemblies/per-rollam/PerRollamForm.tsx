import { useState } from 'react'
import { Modal, Button } from '../../../shared/components'
import { useCreatePerRollam, useUpdatePerRollam } from '../lib/perRollamApi'
import type { PerRollamVoting } from '../lib/perRollamTypes'

interface Props {
  propertyId: string
  voting?: PerRollamVoting
  onClose: () => void
}

export default function PerRollamForm({ propertyId, voting, onClose }: Props) {
  const isEdit = !!voting
  const createMut = useCreatePerRollam()
  const updateMut = useUpdatePerRollam()
  const isPending = createMut.isPending || updateMut.isPending

  const [form, setForm] = useState({
    title: voting?.title ?? '',
    description: voting?.description ?? '',
    deadline: voting?.deadline ? voting.deadline.slice(0, 10) : '',
    notes: voting?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Název je povinný'
    if (!form.deadline) e.deadline = 'Termín je povinný'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data = { propertyId, title: form.title, description: form.description || undefined, deadline: new Date(form.deadline).toISOString(), notes: form.notes || undefined }
    if (isEdit) updateMut.mutate({ id: voting!.id, data }, { onSuccess: () => onClose() })
    else createMut.mutate(data, { onSuccess: () => onClose() })
  }

  const s = (f?: string): React.CSSProperties => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box',
    border: `1px solid ${f && errors[f] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  })

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit per rollam' : 'Nové hlasování per rollam'}
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isPending}>{isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}</Button>
      </div>}>
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={s('title')} placeholder="Hlasování per rollam 1/2026" />
        {errors.title && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.title}</div>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis / průvodní dopis</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...s(), resize: 'vertical' }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Termín hlasování *</label>
        <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} style={s('deadline')} />
        {errors.deadline && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.deadline}</div>}
      </div>
      <div>
        <label className="form-label">Poznámky</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...s(), resize: 'vertical' }} />
      </div>
    </Modal>
  )
}
