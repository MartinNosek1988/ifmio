import { useState } from 'react'
import { Modal, Button } from '../../shared/components'
import { useCreateAssembly, useUpdateAssembly } from './lib/assemblyApi'
import type { Assembly } from './lib/assemblyTypes'

interface Props {
  propertyId: string
  assembly?: Assembly
  onClose: () => void
}

export default function AssemblyForm({ propertyId, assembly, onClose }: Props) {
  const isEdit = !!assembly
  const createMut = useCreateAssembly()
  const updateMut = useUpdateAssembly()
  const isPending = createMut.isPending || updateMut.isPending

  const [form, setForm] = useState({
    title: assembly?.title ?? '',
    description: assembly?.description ?? '',
    scheduledAt: assembly?.scheduledAt ? assembly.scheduledAt.slice(0, 16) : '',
    location: assembly?.location ?? '',
    notes: assembly?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Název je povinný'
    if (!form.scheduledAt) errs.scheduledAt = 'Datum a čas je povinný'
    if (!form.location.trim()) errs.location = 'Místo konání je povinné'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data = {
      propertyId,
      title: form.title,
      description: form.description || undefined,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      location: form.location,
      notes: form.notes || undefined,
    }
    if (isEdit) {
      updateMut.mutate({ id: assembly!.id, data }, { onSuccess: () => onClose() })
    } else {
      createMut.mutate(data, { onSuccess: () => onClose() })
    }
  }

  const inputStyle = (field?: string): React.CSSProperties => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box',
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  })

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit shromáždění' : 'Nové shromáždění'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }>
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle('title')} placeholder="Řádné shromáždění 2026" />
        {errors.title && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.title}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Datum a čas *</label>
          <input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} style={inputStyle('scheduledAt')} />
          {errors.scheduledAt && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.scheduledAt}</div>}
        </div>
        <div>
          <label className="form-label">Místo konání *</label>
          <input value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle('location')} placeholder="Společenská místnost, 1. NP" />
          {errors.location && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.location}</div>}
        </div>
      </div>

      <div>
        <label className="form-label">Poznámky</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical' }} />
      </div>
    </Modal>
  )
}
