import { useState } from 'react'
import { useMyTickets, useCreateTicket, useMyUnits } from './api/portal.queries'
import { LoadingSpinner, Modal, Button } from '../../shared/components'
import { Plus } from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  open: { label: 'Nový', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  in_progress: { label: 'V řešení', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  resolved: { label: 'Vyřešeno', bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  closed: { label: 'Uzavřeno', bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Obecné' },
  { value: 'plumbing', label: 'Instalatérství' },
  { value: 'electrical', label: 'Elektřina' },
  { value: 'hvac', label: 'Topení / klima' },
  { value: 'structural', label: 'Stavební' },
  { value: 'cleaning', label: 'Úklid' },
  { value: 'other', label: 'Jiné' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Nízká' },
  { value: 'medium', label: 'Střední' },
  { value: 'high', label: 'Vysoká' },
]

export default function MyTicketsPage() {
  const { data: tickets, isLoading, error } = useMyTickets()
  const { data: units } = useMyUnits()
  const createMut = useCreateTicket()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'general', priority: 'medium', unitId: '' })

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-danger">Nepodařilo se načíst požadavky.</div>

  const handleSubmit = () => {
    if (!form.title.trim()) return
    createMut.mutate({
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      priority: form.priority,
      unitId: form.unitId || undefined,
    }, {
      onSuccess: () => {
        setShowForm(false)
        setForm({ title: '', description: '', category: 'general', priority: 'medium', unitId: '' })
      },
    })
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button variant="primary" onClick={() => setShowForm(true)} icon={<Plus size={15} />}>Nový požadavek</Button>
      </div>

      {!tickets?.length ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Zatím nemáte žádné požadavky</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr>
                {['#', 'Název', 'Stav', 'Priorita', 'Datum'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t: any) => {
                const st = STATUS_CFG[t.status] ?? STATUS_CFG.open
                return (
                  <tr key={t.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '.8rem' }}>HD-{t.number}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{t.title}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '.82rem', color: 'var(--text-muted)' }}>{t.priority}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '.82rem', color: 'var(--text-muted)' }}>{t.createdAt?.slice(0, 10)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title="Nový požadavek"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowForm(false)}>Zrušit</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={createMut.isPending || !form.title.trim()}>
                {createMut.isPending ? 'Odesílám...' : 'Odeslat'}
              </Button>
            </div>
          }
        >
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Název požadavku *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="Co potřebujete vyřešit?" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Popis</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Podrobný popis problému..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label">Kategorie</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Priorita</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {units?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Jednotka</label>
              <select value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))} style={inputStyle}>
                <option value="">— Vyberte —</option>
                {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}{u.property ? ` (${u.property.name})` : ''}</option>)}
              </select>
            </div>
          )}
          {createMut.isError && <div className="text-danger" style={{ fontSize: '.85rem' }}>Nepodařilo se vytvořit požadavek.</div>}
        </Modal>
      )}
    </div>
  )
}
