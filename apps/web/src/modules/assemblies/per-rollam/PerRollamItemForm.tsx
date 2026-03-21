import { useState } from 'react'
import { Modal, Button } from '../../../shared/components'
import { useAddPerRollamItem } from '../lib/perRollamApi'
import { MAJORITY_LABELS, type MajorityType } from '../lib/assemblyTypes'

interface Props {
  votingId: string
  onClose: () => void
}

export default function PerRollamItemForm({ votingId, onClose }: Props) {
  const addMut = useAddPerRollamItem()
  const [form, setForm] = useState({ title: '', description: '', majorityType: 'NADPOLOVICNI_VSECH' as MajorityType })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.title.trim()) return
    addMut.mutate({ votingId, data: { title: form.title, description: form.description || undefined, majorityType: form.majorityType } }, { onSuccess: () => onClose() })
  }

  const s: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box', border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)' }

  return (
    <Modal open onClose={onClose} title="Přidat hlasovací bod"
      footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Zrušit</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={addMut.isPending || !form.title.trim()}>{addMut.isPending ? 'Ukládám...' : 'Přidat'}</Button>
      </div>}>
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Text usnesení *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={s} placeholder="Schválení účetní závěrky za rok 2025" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Podrobný popis</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...s, resize: 'vertical' }} />
      </div>
      <div>
        <label className="form-label">Typ většiny</label>
        <select value={form.majorityType} onChange={e => set('majorityType', e.target.value)} style={s}>
          {(Object.entries(MAJORITY_LABELS) as [MajorityType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
    </Modal>
  )
}
