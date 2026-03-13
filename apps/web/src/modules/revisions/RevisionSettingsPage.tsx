import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button, Badge, EmptyState, LoadingState } from '../../shared/components'
import {
  useRevisionSubjects, useCreateRevisionSubject, useDeleteRevisionSubject,
  useRevisionTypes, useCreateRevisionType, useDeleteRevisionType,
} from './api/revisions.queries'
import { useProperties } from '../properties/use-properties'

type Tab = 'subjects' | 'types'

export default function RevisionSettingsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('types')

  const { data: subjects, isLoading: loadingSubjects } = useRevisionSubjects()
  const { data: types, isLoading: loadingTypes } = useRevisionTypes()
  const { data: properties } = useProperties()

  const createSubject = useCreateRevisionSubject()
  const deleteSubject = useDeleteRevisionSubject()
  const createType = useCreateRevisionType()
  const deleteType = useDeleteRevisionType()

  // Subject form
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [sf, setSf] = useState({ name: '', category: 'obecne', propertyId: '', location: '', manufacturer: '', model: '', serialNumber: '' })

  // Type form
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [tf, setTf] = useState({ code: '', name: '', defaultIntervalDays: '365', defaultReminderDaysBefore: '30', color: '' })

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const handleCreateSubject = () => {
    if (!sf.name.trim()) return
    createSubject.mutate({
      name: sf.name.trim(),
      category: sf.category,
      propertyId: sf.propertyId || undefined,
      location: sf.location || undefined,
      manufacturer: sf.manufacturer || undefined,
      model: sf.model || undefined,
      serialNumber: sf.serialNumber || undefined,
    }, { onSuccess: () => { setShowSubjectForm(false); setSf({ name: '', category: 'obecne', propertyId: '', location: '', manufacturer: '', model: '', serialNumber: '' }) } })
  }

  const handleCreateType = () => {
    if (!tf.code.trim() || !tf.name.trim()) return
    createType.mutate({
      code: tf.code.trim(),
      name: tf.name.trim(),
      defaultIntervalDays: parseInt(tf.defaultIntervalDays) || 365,
      defaultReminderDaysBefore: parseInt(tf.defaultReminderDaysBefore) || 30,
      color: tf.color || undefined,
    }, { onSuccess: () => { setShowTypeForm(false); setTf({ code: '', name: '', defaultIntervalDays: '365', defaultReminderDaysBefore: '30', color: '' }) } })
  }

  const CATEGORIES = [
    ['obecne', 'Obecné'], ['elektro', 'Elektro'], ['plyn', 'Plyn'], ['kotelna', 'Kotelna'],
    ['hasici', 'Hasicí přístroje'], ['vytah', 'Výtah'], ['hromosvod', 'Hromosvod'], ['eps', 'EPS'],
    ['ezs', 'EZS'], ['fve', 'FVE'], ['tlakova_nadoba', 'Tlaková nádoba'], ['jine', 'Jiné'],
  ]

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button size="sm" onClick={() => navigate('/revisions')}><ArrowLeft size={15} /></Button>
          <div>
            <h1 className="page-title">Katalog revizí</h1>
            <p className="page-subtitle">Předměty revizí a typy kontrol</p>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab-btn${tab === 'types' ? ' active' : ''}`} onClick={() => setTab('types')}>
          Typy revizí ({types?.length ?? 0})
        </button>
        <button className={`tab-btn${tab === 'subjects' ? ' active' : ''}`} onClick={() => setTab('subjects')}>
          Předměty ({subjects?.length ?? 0})
        </button>
      </div>

      {/* ── TYPES TAB ──────────────────────────────────────────── */}
      {tab === 'types' && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setShowTypeForm(!showTypeForm)}>
              Nový typ
            </Button>
          </div>

          {showTypeForm && (
            <div style={{ border: '2px solid var(--accent-blue, #6366f1)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="form-label">Kód *</label>
                  <input value={tf.code} onChange={(e) => setTf({ ...tf, code: e.target.value })} style={inputStyle} placeholder="ELEKTRO" />
                </div>
                <div>
                  <label className="form-label">Název *</label>
                  <input value={tf.name} onChange={(e) => setTf({ ...tf, name: e.target.value })} style={inputStyle} placeholder="Elektro revize" />
                </div>
                <div>
                  <label className="form-label">Interval (dní)</label>
                  <input type="number" value={tf.defaultIntervalDays} onChange={(e) => setTf({ ...tf, defaultIntervalDays: e.target.value })} style={inputStyle} min="1" />
                </div>
                <div>
                  <label className="form-label">Reminder (dní)</label>
                  <input type="number" value={tf.defaultReminderDaysBefore} onChange={(e) => setTf({ ...tf, defaultReminderDaysBefore: e.target.value })} style={inputStyle} min="1" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="primary" onClick={handleCreateType} disabled={createType.isPending}>
                  {createType.isPending ? 'Vytvářím...' : 'Vytvořit'}
                </Button>
                <Button size="sm" onClick={() => setShowTypeForm(false)}>Zrušit</Button>
              </div>
            </div>
          )}

          {loadingTypes ? <LoadingState /> : !types?.length ? (
            <EmptyState title="Žádné typy" description="Vytvořte první typ revize." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Kód</th>
                  <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Název</th>
                  <th style={{ textAlign: 'right', padding: '8px 0' }} className="text-muted">Interval</th>
                  <th style={{ textAlign: 'right', padding: '8px 0' }} className="text-muted">Reminder</th>
                  <th style={{ textAlign: 'center', padding: '8px 0' }} className="text-muted">Aktivní</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', fontFamily: 'monospace', fontWeight: 600 }}>{t.code}</td>
                    <td style={{ padding: '8px 0' }}>{t.name}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{t.defaultIntervalDays}d</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{t.defaultReminderDaysBefore}d</td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>
                      <Badge variant={t.isActive ? 'green' : 'muted'}>{t.isActive ? 'Ano' : 'Ne'}</Badge>
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      <button onClick={() => deleteType.mutate(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }} title="Smazat">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── SUBJECTS TAB ───────────────────────────────────────── */}
      {tab === 'subjects' && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setShowSubjectForm(!showSubjectForm)}>
              Nový předmět
            </Button>
          </div>

          {showSubjectForm && (
            <div style={{ border: '2px solid var(--accent-blue, #6366f1)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="form-label">Název *</label>
                  <input value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} style={inputStyle} placeholder="Název zařízení" />
                </div>
                <div>
                  <label className="form-label">Kategorie</label>
                  <select value={sf.category} onChange={(e) => setSf({ ...sf, category: e.target.value })} style={inputStyle}>
                    {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Objekt</label>
                  <select value={sf.propertyId} onChange={(e) => setSf({ ...sf, propertyId: e.target.value })} style={inputStyle}>
                    <option value="">—</option>
                    {(properties ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Umístění</label>
                  <input value={sf.location} onChange={(e) => setSf({ ...sf, location: e.target.value })} style={inputStyle} placeholder="2. PP, rozvodna" />
                </div>
                <div>
                  <label className="form-label">Výrobce</label>
                  <input value={sf.manufacturer} onChange={(e) => setSf({ ...sf, manufacturer: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label className="form-label">Model</label>
                  <input value={sf.model} onChange={(e) => setSf({ ...sf, model: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="primary" onClick={handleCreateSubject} disabled={createSubject.isPending}>
                  {createSubject.isPending ? 'Vytvářím...' : 'Vytvořit'}
                </Button>
                <Button size="sm" onClick={() => setShowSubjectForm(false)}>Zrušit</Button>
              </div>
            </div>
          )}

          {loadingSubjects ? <LoadingState /> : !subjects?.length ? (
            <EmptyState title="Žádné předměty" description="Vytvořte první předmět revize." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Název</th>
                  <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Kategorie</th>
                  <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Objekt</th>
                  <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Umístění</th>
                  <th style={{ textAlign: 'left', padding: '8px 0' }} className="text-muted">Výrobce</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '8px 0' }}><Badge variant="blue">{s.category}</Badge></td>
                    <td style={{ padding: '8px 0' }} className="text-muted">{s.property?.name ?? '—'}</td>
                    <td style={{ padding: '8px 0' }} className="text-muted">{s.location ?? '—'}</td>
                    <td style={{ padding: '8px 0' }} className="text-muted">{s.manufacturer ?? '—'}</td>
                    <td style={{ padding: '8px 0' }}>
                      <button onClick={() => deleteSubject.mutate(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }} title="Smazat">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
