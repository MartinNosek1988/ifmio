import { useState } from 'react'
import { Plus, Trash2, Settings2 } from 'lucide-react'
import { Button, Badge, EmptyState, LoadingState, SearchBar } from '../../shared/components'
import {
  useAssetTypes, useCreateAssetType, useDeleteAssetType,
} from './api/asset-types.queries'
import AssetTypeDetailModal from './AssetTypeDetailModal'
import type { ApiAssetType } from './api/asset-types.api'

const CATEGORY_LABELS: Record<string, string> = {
  tzb: 'TZB', kotelna: 'Kotelna', elektro: 'Elektro', plyn: 'Plyn',
  hasici: 'Hasicí přístroje', vytah: 'Výtah', hromosvod: 'Hromosvod',
  eps: 'EPS', ezs: 'EZS', fve: 'FVE', stroje: 'Stroje',
  vybaveni: 'Vybavení', vozidla: 'Vozidla', it: 'IT', ostatni: 'Ostatní',
}

const CATEGORIES = [
  ['ostatni', 'Ostatní'], ['tzb', 'TZB'], ['kotelna', 'Kotelna'], ['elektro', 'Elektro'],
  ['plyn', 'Plyn'], ['hasici', 'Hasicí přístroje'], ['vytah', 'Výtah'], ['hromosvod', 'Hromosvod'],
  ['eps', 'EPS'], ['ezs', 'EZS'], ['fve', 'FVE'], ['stroje', 'Stroje'],
  ['vybaveni', 'Vybavení'], ['vozidla', 'Vozidla'], ['it', 'IT'],
]

export default function AssetTypesPage() {
  const { data: assetTypes, isLoading } = useAssetTypes()
  const createMut = useCreateAssetType()
  const deleteMut = useDeleteAssetType()

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<ApiAssetType | null>(null)
  const [form, setForm] = useState({ name: '', code: '', category: 'ostatni', description: '', manufacturer: '', model: '' })

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const filtered = (assetTypes ?? []).filter((at) => {
    if (!search) return true
    const q = search.toLowerCase()
    return at.name.toLowerCase().includes(q) || at.code.toLowerCase().includes(q)
  })

  const handleCreate = () => {
    if (!form.name.trim() || !form.code.trim()) return
    createMut.mutate({
      name: form.name.trim(),
      code: form.code.trim(),
      category: form.category,
      description: form.description || undefined,
      manufacturer: form.manufacturer || undefined,
      model: form.model || undefined,
    }, {
      onSuccess: () => {
        setShowForm(false)
        setForm({ name: '', code: '', category: 'ostatni', description: '', manufacturer: '', model: '' })
      },
    })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Typy zařízení</h1>
          <p className="page-subtitle">Katalog typů zařízení s přiřazenými činnostmi</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(!showForm)}>
          Nový typ
        </Button>
      </div>

      {showForm && (
        <div style={{ border: '2px solid var(--accent-blue, #6366f1)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="form-label">Název *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Plynový kotel" />
            </div>
            <div>
              <label className="form-label">Kód *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={inputStyle} placeholder="KOTEL_PLYN" />
            </div>
            <div>
              <label className="form-label">Kategorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Výrobce (výchozí)</label>
              <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Model (výchozí)</label>
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label className="form-label">Popis</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="primary" onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? 'Vytvářím...' : 'Vytvořit'}
            </Button>
            <Button size="sm" onClick={() => setShowForm(false)}>Zrušit</Button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat typ zařízení..." onSearch={setSearch} />
      </div>

      {isLoading ? <LoadingState /> : !filtered.length ? (
        <EmptyState title="Žádné typy zařízení" description="Vytvořte první typ zařízení pro definování opakovaných činností." />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Kód</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Název</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Kategorie</th>
              <th style={{ textAlign: 'right', padding: '8px 0' }} className="text-muted">Aktiva</th>
              <th style={{ textAlign: 'right', padding: '8px 0' }} className="text-muted">Činnosti</th>
              <th style={{ textAlign: 'center', padding: '8px 0' }} className="text-muted">Aktivní</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((at) => (
              <tr key={at.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelected(at)}>
                <td style={{ padding: '8px 0', fontFamily: 'monospace', fontWeight: 600 }}>{at.code}</td>
                <td style={{ padding: '8px 0' }}>{at.name}</td>
                <td style={{ padding: '8px 0' }}>
                  <Badge variant="blue">{CATEGORY_LABELS[at.category] ?? at.category}</Badge>
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{at._count?.assets ?? 0}</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>
                  <Badge variant={at._count?.activityAssignments ? 'green' : 'muted'}>
                    {at._count?.activityAssignments ?? 0}
                  </Badge>
                </td>
                <td style={{ padding: '8px 0', textAlign: 'center' }}>
                  <Badge variant={at.isActive ? 'green' : 'muted'}>{at.isActive ? 'Ano' : 'Ne'}</Badge>
                </td>
                <td style={{ padding: '8px 0' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setSelected(at)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                      title="Detail"
                    >
                      <Settings2 size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Smazat typ zařízení?')) deleteMut.mutate(at.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
                      title="Smazat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <AssetTypeDetailModal
          assetType={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
