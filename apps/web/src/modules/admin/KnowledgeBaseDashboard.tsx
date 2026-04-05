import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Database, Play, Pause, Plus, Trash2, RotateCcw, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react'

// ── Types ───────────────────────────────────────────

interface TerritoryCoverage {
  id: string
  code: string
  name: string
  level: string
  totalBuildings: number | null
  inKb: number
  coveragePercent: number | null
  avgQuality: number
  hasChildren: boolean
}

interface BulkImportJob {
  id: string
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
  step: string
  region: string
  district?: string
  totalEstimated: number
  processed: number
  created: number
  updated: number
  errors: number
  startedAt: string
  completedAt?: string
  error?: string
  currentBuilding?: string
  currentStep?: string
  avgQuality?: number
}

interface EvidenceTask {
  id: string
  assigneeId?: string
  assigneeName?: string
  region: string
  district?: string
  cadastralArea?: string
  targetCount: number
  currentCount: number
  deadline?: string
  status: string
  note?: string
}

// ── Styles ──────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--card-bg, #fff)',
  borderRadius: 12,
  border: '1px solid var(--border, #e5e7eb)',
  padding: 20,
}

const headerStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-secondary, #6b7280)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  marginBottom: 12,
}

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--primary, #0d9488)',
  color: '#fff',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
}

const btnSmall: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid var(--border, #e5e7eb)',
  background: 'transparent',
  fontSize: '0.72rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--border, #d1d5db)',
  fontSize: '0.82rem',
  background: 'var(--input-bg, #fff)',
}

// ── Main Component ──────────────────────────────────

export default function KnowledgeBaseDashboard() {
  const { data: stats } = useQuery<{ buildings: number; avgQuality: number; withOrg: number }>({
    queryKey: ['kb-stats'],
    queryFn: () => apiClient.get('/knowledge-base/stats').then(r => {
      const d = r.data
      return { buildings: d.buildings || 0, avgQuality: Math.round(d.avgQuality || 0), withOrg: d.organizations || 0 }
    }),
    refetchInterval: 30000,
  })

  const { data: jobs = [] } = useQuery<BulkImportJob[]>({
    queryKey: ['kb-import-jobs'],
    queryFn: () => apiClient.get('/knowledge-base/bulk-import/jobs').then(r => r.data),
    refetchInterval: 2000,
  })

  const { data: tasks = [] } = useQuery<EvidenceTask[]>({
    queryKey: ['kb-evidence-tasks'],
    queryFn: () => apiClient.get('/knowledge-base/evidence-tasks').then(r => r.data),
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={22} /> CRM / Knowledge Base
          </h1>
          {stats && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {stats.buildings.toLocaleString('cs-CZ')} budov &middot; {'\u00D8'} quality {stats.avgQuality} &middot; {stats.withOrg} organizací
            </div>
          )}
        </div>
      </div>

      {/* Top row: Territory Coverage Tree + Import */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 16, marginBottom: 16 }}>
        <TerritoryCoverageTree />
        <BulkImportPanel jobs={jobs} />
      </div>

      {/* Bottom: Evidence Tasks */}
      <EvidenceTaskList tasks={tasks} />
    </div>
  )
}

// ── Territory Coverage Tree ─────────────────────────

function TerritoryCoverageTree() {
  return (
    <div style={card}>
      <div style={headerStyle}>Pokrytí per území</div>
      {/* Table header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '2px solid var(--border)' }}>
        <span style={{ width: 16, flexShrink: 0 }} />
        <span style={{ flex: 1 }}>Území</span>
        <span style={{ minWidth: 55, textAlign: 'right' }}>Celkem</span>
        <span style={{ minWidth: 50, textAlign: 'right' }}>V KB</span>
        <span style={{ minWidth: 50, textAlign: 'right' }}>Pokrytí</span>
        <span style={{ minWidth: 35, textAlign: 'right' }}>Avg Q</span>
        <span style={{ width: 80 }} />
      </div>
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        <TerritoryCoverageLevel parentId={undefined} depth={0} />
      </div>
    </div>
  )
}

function TerritoryCoverageLevel({ parentId, depth }: { parentId: string | undefined; depth: number }) {
  const { data: items = [], isLoading } = useQuery<TerritoryCoverage[]>({
    queryKey: ['territory-coverage', parentId],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (parentId) params.parentId = parentId
      return apiClient.get('/knowledge-base/stats/territory-coverage', { params }).then(r => r.data)
    },
  })

  if (isLoading && depth === 0) {
    return <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Načítám...</div>
  }

  if (items.length === 0) {
    if (depth === 0) return <SeedTerritoryPrompt />
    return null
  }

  return (
    <div>
      {items.map(t => (
        <TerritoryCoverageRow key={t.id} item={t} depth={depth} />
      ))}
    </div>
  )
}

function SeedTerritoryPrompt() {
  const qc = useQueryClient()
  const seedMut = useMutation({
    mutationFn: () => apiClient.post('/knowledge-base/territories/seed').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['territory-coverage'] }),
  })
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
        Územní hierarchie zatím není načtena. Seedujte kraje, okresy a Praha MČ/KÚ z RÚIAN.
      </div>
      <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--primary, #0d9488)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
        {seedMut.isPending ? 'Seeduji...' : 'Seed teritorií'}
      </button>
      {seedMut.isError && <div style={{ marginTop: 8, color: 'var(--danger)', fontSize: '0.78rem' }}>Seed selhal (vyžaduje super admin oprávnění)</div>}
    </div>
  )
}

function TerritoryCoverageRow({ item, depth }: { item: TerritoryCoverage; depth: number }) {
  const [expanded, setExpanded] = useState(false)

  const qColor = item.avgQuality >= 70 ? '#16a34a' : item.avgQuality >= 40 ? '#d97706' : '#dc2626'
  const covColor = item.coveragePercent != null
    ? item.coveragePercent >= 80 ? '#16a34a' : item.coveragePercent >= 30 ? '#d97706' : '#dc2626'
    : 'var(--text-muted)'
  const indent = depth * 20

  return (
    <>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
          paddingLeft: 8 + indent, fontSize: '0.82rem',
          borderBottom: '1px solid var(--border-light, #f3f4f6)',
          cursor: item.hasChildren ? 'pointer' : 'default',
          background: expanded ? 'var(--border-light, #f9fafb)' : 'transparent',
        }}
        onClick={() => item.hasChildren && setExpanded(!expanded)}
      >
        {/* Expand icon */}
        <span style={{ width: 16, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {item.hasChildren && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </span>

        {/* Name */}
        <span style={{ flex: 1, fontWeight: item.inKb > 0 ? 500 : 400 }}>
          {item.name}
        </span>

        {/* Total buildings (from RÚIAN) */}
        <span style={{ minWidth: 55, textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {item.totalBuildings != null ? item.totalBuildings.toLocaleString('cs-CZ') : '—'}
        </span>

        {/* In KB */}
        <span style={{ minWidth: 50, textAlign: 'right', fontWeight: 600, fontSize: '0.78rem' }}>
          {item.inKb > 0 ? item.inKb.toLocaleString('cs-CZ') : '—'}
        </span>

        {/* Coverage % */}
        <span style={{ minWidth: 50, textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, color: covColor }}>
          {item.coveragePercent != null ? `${item.coveragePercent}%` : '—'}
        </span>

        {/* Avg quality */}
        <span style={{ minWidth: 35, textAlign: 'right', fontSize: '0.78rem', color: item.inKb > 0 ? qColor : 'var(--text-muted)' }}>
          {item.inKb > 0 ? item.avgQuality : '—'}
        </span>

        {/* Coverage bar */}
        <div style={{ width: 80, flexShrink: 0 }}>
          {item.coveragePercent != null && (
            <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(item.coveragePercent, 100)}%`,
                background: covColor, borderRadius: 3,
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && <TerritoryCoverageLevel parentId={item.id} depth={depth + 1} />}
    </>
  )
}

// ─── Bulk Import Panel ───────────────────────────────

function BulkImportPanel({ jobs }: { jobs: BulkImportJob[] }) {
  const qc = useQueryClient()
  const [region, setRegion] = useState('Praha')
  const [district, setDistrict] = useState('')

  // Fetch MČ from territory for selected city
  const { data: cityParts = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['territories-mc-for-import', region],
    queryFn: async () => {
      // Find the municipality, then get its CITY_PART children
      const obec = await apiClient.get('/knowledge-base/territories', {
        params: { level: 'MUNICIPALITY', q: region },
      }).then(r => r.data)
      if (obec.length === 0) return []
      const mc = await apiClient.get('/knowledge-base/territories', {
        params: { level: 'CITY_PART', parentId: obec[0].id },
      }).then(r => r.data)
      return mc.map((m: any) => ({ id: m.id, name: m.name }))
    },
  })

  const fullJob = jobs.find(j => j.step === 'FULL' && j.region === region)
  const isRunning = fullJob?.status === 'RUNNING'
  const isPaused = fullJob?.status === 'PAUSED'
  const isCompleted = fullJob?.status === 'COMPLETED'
  const isFailed = fullJob?.status === 'FAILED'
  const pct = fullJob && fullJob.totalEstimated > 0
    ? Math.round((fullJob.processed / fullJob.totalEstimated) * 100)
    : 0

  const startMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/knowledge-base/bulk-import/full', { region, district: district || undefined }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-import-jobs'] }),
  })

  const pauseMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post(`/knowledge-base/bulk-import/${jobId}/pause`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-import-jobs'] }),
  })

  const resumeMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post(`/knowledge-base/bulk-import/${jobId}/resume`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-import-jobs'] }),
  })

  return (
    <div style={card}>
      <div style={headerStyle}>Kompletní import</div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={region} onChange={e => { setRegion(e.target.value); setDistrict('') }} style={inputStyle} disabled={isRunning}>
          <option value="Praha">Praha</option>
          <option value="Brno">Brno</option>
          <option value="Ostrava">Ostrava</option>
          <option value="Plzeň">Plzeň</option>
          <option value="Liberec">Liberec</option>
          <option value="Olomouc">Olomouc</option>
          <option value="České Budějovice">České Budějovice</option>
          <option value="Hradec Králové">Hradec Králové</option>
          <option value="Ústí nad Labem">Ústí nad Labem</option>
          <option value="Pardubice">Pardubice</option>
          <option value="Zlín">Zlín</option>
          <option value="Karlovy Vary">Karlovy Vary</option>
          <option value="Jihlava">Jihlava</option>
        </select>
        {cityParts.length > 0 && (
          <select value={district} onChange={e => setDistrict(e.target.value)} style={inputStyle} disabled={isRunning}>
            <option value="">Všechny MČ</option>
            {cityParts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        )}
        {!isRunning && !isPaused && (
          <button style={btnPrimary} onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
            <Play size={14} /> Spustit
          </button>
        )}
        {isRunning && (
          <button style={btnSmall} onClick={() => pauseMutation.mutate(fullJob!.id)}>
            <Pause size={12} /> Pozastavit
          </button>
        )}
        {isPaused && (
          <button style={btnSmall} onClick={() => resumeMutation.mutate(fullJob!.id)}>
            <Play size={12} /> Pokračovat
          </button>
        )}
      </div>

      {/* Progress */}
      {fullJob && (
        <div style={{ padding: '10px 12px', background: 'var(--border-light, #f9fafb)', borderRadius: 8 }}>
          {isRunning && fullJob.currentBuilding && (
            <div style={{ fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>
              Zpracovávám: {fullJob.currentBuilding}
              {fullJob.currentStep && <span style={{ color: 'var(--primary)', marginLeft: 6 }}>[{fullJob.currentStep}]</span>}
            </div>
          )}

          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: isRunning ? 'var(--primary, #0d9488)' : isPaused ? 'var(--warning, #d97706)' : isFailed ? 'var(--danger, #dc2626)' : 'var(--success, #16a34a)',
              borderRadius: 4,
              transition: 'width 0.5s',
            }} />
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span>{fullJob.processed.toLocaleString('cs-CZ')}/{fullJob.totalEstimated.toLocaleString('cs-CZ')} ({pct}%)</span>
            <span>{fullJob.created} vytvořeno</span>
            {fullJob.avgQuality !== undefined && <span>Avg Q: {fullJob.avgQuality}</span>}
            {fullJob.errors > 0 && <span style={{ color: 'var(--danger)' }}>{fullJob.errors} chyb</span>}
          </div>

          {isFailed && fullJob.error && (
            <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 4 }}>{fullJob.error}</div>
          )}
          {isCompleted && (
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>
              <CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
              Import dokončen
            </div>
          )}
        </div>
      )}

      {!fullJob && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px 0' }}>
          Sekvenční import: RÚIAN &rarr; ARES &rarr; Enrichment &rarr; Justice.cz per budova
        </div>
      )}
    </div>
  )
}

// ── Evidence Task List ──────────────────────────────

function EvidenceTaskList({ tasks }: { tasks: EvidenceTask[] }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ region: 'Praha', district: '', cadastralArea: '', assigneeName: '', targetCount: '300', deadline: '', note: '' })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post('/knowledge-base/evidence-tasks', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kb-evidence-tasks'] }); setShowForm(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/knowledge-base/evidence-tasks/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-evidence-tasks'] }),
  })

  const recalcMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/knowledge-base/evidence-tasks/${id}/recalculate`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-evidence-tasks'] }),
  })

  const handleCreate = useCallback(() => {
    createMutation.mutate({
      region: form.region,
      district: form.district || undefined,
      cadastralArea: form.cadastralArea || undefined,
      assigneeName: form.assigneeName || undefined,
      targetCount: Number(form.targetCount) || 300,
      deadline: form.deadline || undefined,
      note: form.note || undefined,
    })
  }, [form, createMutation])

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={headerStyle}>Úkoly evidence</div>
        <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Přidat
        </button>
      </div>

      {showForm && (
        <div style={{ padding: 12, background: 'var(--border-light, #f9fafb)', borderRadius: 8, marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
          <input style={inputStyle} placeholder="Oblast (Praha 7)" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
          <input style={inputStyle} placeholder="KU (Holesovice)" value={form.cadastralArea} onChange={e => setForm(f => ({ ...f, cadastralArea: e.target.value }))} />
          <input style={inputStyle} placeholder="Zaměstnanec" value={form.assigneeName} onChange={e => setForm(f => ({ ...f, assigneeName: e.target.value }))} />
          <input style={inputStyle} placeholder="Cíl (počet)" type="number" value={form.targetCount} onChange={e => setForm(f => ({ ...f, targetCount: e.target.value }))} />
          <input style={inputStyle} type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          <button style={btnPrimary} onClick={handleCreate} disabled={createMutation.isPending}>Vytvořit</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
            <th style={{ padding: '6px 6px' }}>Zaměstnanec</th>
            <th style={{ padding: '6px 6px' }}>Oblast</th>
            <th style={{ padding: '6px 6px', textAlign: 'right' }}>Cíl</th>
            <th style={{ padding: '6px 6px', textAlign: 'right' }}>Hotovo</th>
            <th style={{ padding: '6px 6px', textAlign: 'right' }}>%</th>
            <th style={{ padding: '6px 6px', width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => {
            const pct = t.targetCount > 0 ? Math.round((t.currentCount / t.targetCount) * 100) : 0
            return (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)' }}>
                <td style={{ padding: '6px 6px', fontWeight: 500 }}>{t.assigneeName || '(nepřiřazeno)'}</td>
                <td style={{ padding: '6px 6px' }}>{t.district || t.cadastralArea || t.region}</td>
                <td style={{ padding: '6px 6px', textAlign: 'right' }}>{t.targetCount}</td>
                <td style={{ padding: '6px 6px', textAlign: 'right' }}>{t.currentCount}</td>
                <td style={{ padding: '6px 6px', textAlign: 'right' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 8,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef3c7' : '#fee2e2',
                    color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626',
                  }}>
                    {pct}%
                  </span>
                </td>
                <td style={{ padding: '6px 6px', display: 'flex', gap: 4 }}>
                  <button style={btnSmall} onClick={() => recalcMutation.mutate(t.id)} title="Přepočítat">
                    <RotateCcw size={12} />
                  </button>
                  <button style={{ ...btnSmall, color: 'var(--danger, #dc2626)' }} onClick={() => deleteMutation.mutate(t.id)} title="Smazat">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            )
          })}
          {tasks.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Žádné úkoly</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
