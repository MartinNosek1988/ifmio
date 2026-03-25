import { useState, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, Modal, LoadingState, EmptyState } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useProperties } from '../../properties/use-properties'
import { useEvidenceFolders, useCreateEvidenceFolder, useUpdateEvidenceFolder, useDeleteEvidenceFolder } from './evidence-folders.queries'
import { formatKc } from '../../../shared/utils/format'
import type { ApiEvidenceFolder } from './evidence-folders.api'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
  color: 'var(--text)', boxSizing: 'border-box', fontSize: '.85rem',
}

export default function EvidenceFoldersTab() {
  const { data: properties = [] } = useProperties()
  const [propertyId, setPropertyId] = useState('')
  const { data: folders = [], isLoading } = useEvidenceFolders(propertyId || undefined)
  const [showForm, setShowForm] = useState(false)
  const [editFolder, setEditFolder] = useState<ApiEvidenceFolder | null>(null)
  const [showCostsPdf, setShowCostsPdf] = useState(false)
  const [costsYear, setCostsYear] = useState(String(new Date().getFullYear() - 1))
  const [costsLoading, setCostsLoading] = useState(false)
  const toast = useToast()

  const createMut = useCreateEvidenceFolder()
  const updateMut = useUpdateEvidenceFolder()
  const deleteMut = useDeleteEvidenceFolder()

  const [form, setForm] = useState({ name: '', code: '', description: '', color: '#6366f1', sortOrder: '0' })

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id)
  }, [properties, propertyId])

  if (!propertyId) return <EmptyState title="Žádná nemovitost" description="Nejprve vytvořte nemovitost." />

  const openCreate = () => {
    setEditFolder(null)
    setForm({ name: '', code: '', description: '', color: '#6366f1', sortOrder: '0' })
    setShowForm(true)
  }

  const openEdit = (f: ApiEvidenceFolder) => {
    setEditFolder(f)
    setForm({ name: f.name, code: f.code ?? '', description: f.description ?? '', color: f.color ?? '#6366f1', sortOrder: String(f.sortOrder) })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Název je povinný.'); return }
    const dto: Record<string, unknown> = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      color: form.color,
      sortOrder: parseInt(form.sortOrder) || 0,
    }
    try {
      if (editFolder) {
        await updateMut.mutateAsync({ id: editFolder.id, dto })
        toast.success('Složka upravena.')
      } else {
        await createMut.mutateAsync({ ...dto, propertyId })
        toast.success('Složka vytvořena.')
      }
      setShowForm(false)
    } catch {
      toast.error('Uložení se nezdařilo.')
    }
  }

  const handleDelete = async (f: ApiEvidenceFolder) => {
    if (!confirm(`Archivovat složku "${f.name}"?`)) return
    try {
      await deleteMut.mutateAsync(f.id)
      toast.success('Složka archivována.')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Archivace se nezdařila.')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        {properties.length > 1 && (
          <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '.85rem' }}>
            {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <Button variant="primary" size="sm" onClick={openCreate}>Nová evidenční složka</Button>
        <Button size="sm" onClick={() => setShowCostsPdf(true)}>Náklady dle složek PDF</Button>
      </div>

      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        Evidenční složky slouží pro přehled správce (pojištění, odměny, bankovní poplatky…). Nevstupují do vyúčtování vlastníků.
      </div>

      {isLoading ? <LoadingState text="Načítání…" /> : folders.length === 0 ? (
        <EmptyState title="Žádné evidenční složky" description="Vytvořte první evidenční složku." />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                {['', 'Název', 'Kód', 'Popis', 'Nákladů', 'Celkem', 'Akce'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {folders.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', width: 20 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: f.color ?? '#ccc' }} />
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{f.name}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{f.code ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description ?? '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{f._count?.allocations ?? 0}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatKc(f.totalAllocated)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <button className="btn btn--sm" onClick={() => openEdit(f)} style={{ padding: '2px 6px' }}><Pencil size={12} /></button>
                    <button className="btn btn--sm" onClick={() => handleDelete(f)} style={{ padding: '2px 6px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title={editFolder ? 'Upravit evidenční složku' : 'Nová evidenční složka'} footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowForm(false)}>Zrušit</Button>
            <Button variant="primary" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending || !form.name.trim()}>
              {createMut.isPending || updateMut.isPending ? 'Ukládám…' : 'Uložit'}
            </Button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">Název *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Pojištění nemovitosti" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Kód</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Pořadí</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="form-label">Barva</label>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 36, padding: 0, border: 'none', cursor: 'pointer' }} />
              </div>
            </div>
            <div>
              <label className="form-label">Popis</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}

      {showCostsPdf && (
        <Modal open onClose={() => setShowCostsPdf(false)} title="Náklady dle složek — PDF" footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowCostsPdf(false)}>Zavřít</Button>
            <Button variant="primary" disabled={costsLoading} onClick={async () => {
              setCostsLoading(true)
              try {
                const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1'
                const token = sessionStorage.getItem('ifmio:access_token')
                const res = await fetch(`${baseUrl}/reports/costs-by-folder?propertyId=${propertyId}&year=${costsYear}&format=pdf`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const blob = await res.blob()
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = `naklady-dle-slozek-${costsYear}.pdf`
                link.click()
                URL.revokeObjectURL(link.href)
                setShowCostsPdf(false)
              } catch {
                toast.error('Generování PDF se nezdařilo.')
              } finally {
                setCostsLoading(false)
              }
            }}>
              {costsLoading ? 'Generuji…' : 'Generovat PDF'}
            </Button>
          </div>
        }>
          <div>
            <label className="form-label">Rok</label>
            <select value={costsYear} onChange={e => setCostsYear(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </Modal>
      )}
    </div>
  )
}
