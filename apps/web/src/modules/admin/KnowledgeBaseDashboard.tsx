import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Database, Play, Pause, Plus, Trash2, RotateCcw, CheckCircle2 } from 'lucide-react'

// ── Types ───────────────────────────────────────────

interface CoverageData {
  total: number
  withOrganization: number
  districts: Array<{ district: string | null; _count: { _all: number }; _avg: { dataQualityScore: number | null } }>
  qualityBreakdown: Array<{ level: string; count: number }>
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
  const [city, setCity] = useState('Praha')

  const { data: coverage, isLoading: coverageLoading } = useQuery<CoverageData>({
    queryKey: ['kb-coverage', city],
    queryFn: () => apiClient.get('/knowledge-base/stats/coverage', { params: { city } }).then(r => r.data),
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

  const avgQuality = coverage?.districts?.length
    ? Math.round(coverage.districts.reduce((s, d) => s + (d._avg.dataQualityScore || 0), 0) / coverage.districts.length)
    : 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={22} /> Knowledge Base
          </h1>
          {coverage && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {coverage.total.toLocaleString('cs-CZ')} budov &middot; {'\u00D8'} quality {avgQuality} &middot; {coverage.withOrganization} s SVJ/BD
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={city} onChange={e => setCity(e.target.value)} style={inputStyle}>
            <option value="Praha">Praha</option>
            <option value="Brno">Brno</option>
            <option value="Ostrava">Ostrava</option>
            <option value="Plzeň">Plzeň</option>
          </select>
        </div>
      </div>

      {coverageLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Načítám...</div>
      ) : (
        <>
          {/* Top row: Coverage + Quality */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>
            <CoverageTable districts={coverage?.districts || []} total={coverage?.total || 0} />
            <QualityBreakdown breakdown={coverage?.qualityBreakdown || []} total={coverage?.total || 0} />
          </div>

          {/* Bottom row: Bulk Import + Evidence Tasks */}
          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16 }}>
            <BulkImportPanel jobs={jobs} city={city} />
            <EvidenceTaskList tasks={tasks} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Coverage Table ──────────────────────────────────

function CoverageTable({ districts, total }: {
  districts: CoverageData['districts']
  total: number
}) {
  return (
    <div style={card}>
      <div style={headerStyle}>Pokrytí per městská část</div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Cast</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>V KB</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Avg Q</th>
              <th style={{ padding: '6px 8px', width: 180 }}>Kvalita</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d, i) => {
              const q = d._avg.dataQualityScore || 0
              const pct = total > 0 ? Math.round((d._count._all / total) * 100) : 0
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-light, #f3f4f6)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{d.district || '(nezadáno)'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{d._count._all}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: q >= 70 ? 'var(--success, #16a34a)' : q >= 40 ? 'var(--warning, #d97706)' : 'var(--danger, #dc2626)' }}>
                    {Math.round(q)}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 8, background: 'var(--border-light, #f3f4f6)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(q, 100)}%`,
                          borderRadius: 4,
                          background: q >= 70 ? 'var(--success, #16a34a)' : q >= 40 ? 'var(--warning, #d97706)' : 'var(--danger, #dc2626)',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: 28 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {districts.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Žádná data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Quality Breakdown ───────────────────────────────

const QUALITY_LEVELS: Record<string, { label: string; color: string }> = {
  excellent: { label: '80-100 Excelentní', color: '#16a34a' },
  good: { label: '50-79 Dobrá', color: '#2563eb' },
  basic: { label: '20-49 Základní', color: '#d97706' },
  empty: { label: '0-19 Prázdná', color: '#dc2626' },
}

function QualityBreakdown({ breakdown, total }: { breakdown: CoverageData['qualityBreakdown']; total: number }) {
  return (
    <div style={card}>
      <div style={headerStyle}>Kvalita dat</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(['excellent', 'good', 'basic', 'empty'] as const).map(level => {
          const item = breakdown.find(b => b.level === level)
          const count = item?.count || 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const cfg = QUALITY_LEVELS[level]
          return (
            <div key={level}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                <span>{cfg.label}</span>
                <span style={{ fontWeight: 600 }}>{count.toLocaleString('cs-CZ')} ({pct}%)</span>
              </div>
              <div style={{ height: 10, background: 'var(--border-light, #f3f4f6)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 5 }} />
              </div>
            </div>
          )
        })}
      </div>

      {total > 0 && (
        <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--border-light, #f9fafb)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Celkem {total.toLocaleString('cs-CZ')} budov v Knowledge Base
        </div>
      )}
    </div>
  )
}

// ── Bulk Import Panel ───────────────────────────────

const PRAHA_DISTRICTS = [
  '', 'Praha 1', 'Praha 2', 'Praha 3', 'Praha 4', 'Praha 5', 'Praha 6', 'Praha 7',
  'Praha 8', 'Praha 9', 'Praha 10', 'Praha 11', 'Praha 12', 'Praha 13', 'Praha 14',
  'Praha 15', 'Praha 16', 'Praha 17', 'Praha 18', 'Praha 19', 'Praha 20', 'Praha 21', 'Praha 22',
]

function BulkImportPanel({ jobs, city }: { jobs: BulkImportJob[]; city: string }) {
  const qc = useQueryClient()
  const [district, setDistrict] = useState('')

  const fullJob = jobs.find(j => j.step === 'FULL' && j.region === city)
  const isRunning = fullJob?.status === 'RUNNING'
  const isPaused = fullJob?.status === 'PAUSED'
  const isCompleted = fullJob?.status === 'COMPLETED'
  const isFailed = fullJob?.status === 'FAILED'
  const pct = fullJob && fullJob.totalEstimated > 0
    ? Math.round((fullJob.processed / fullJob.totalEstimated) * 100)
    : 0

  const startMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/knowledge-base/bulk-import/full', { region: city, district: district || undefined }).then(r => r.data),
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select value={district} onChange={e => setDistrict(e.target.value)} style={inputStyle} disabled={isRunning}>
          <option value="">Všechny městské části</option>
          {PRAHA_DISTRICTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {!isRunning && !isPaused && (
          <button style={btnPrimary} onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
            <Play size={14} /> Spustit kompletní import
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
          {/* Current building */}
          {isRunning && fullJob.currentBuilding && (
            <div style={{ fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>
              Zpracovávám: {fullJob.currentBuilding}
              {fullJob.currentStep && <span style={{ color: 'var(--primary)', marginLeft: 6 }}>[{fullJob.currentStep}]</span>}
            </div>
          )}

          {/* Progress bar */}
          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: isRunning ? 'var(--primary, #0d9488)' : isPaused ? 'var(--warning, #d97706)' : isFailed ? 'var(--danger, #dc2626)' : 'var(--success, #16a34a)',
              borderRadius: 4,
              transition: 'width 0.5s',
            }} />
          </div>

          {/* Stats */}
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
          Sekvenční import: RÚIAN → ARES → Enrichment → Justice.cz per budova
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
            <th style={{ padding: '6px 6px', textAlign: 'right' }}>Cil</th>
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
