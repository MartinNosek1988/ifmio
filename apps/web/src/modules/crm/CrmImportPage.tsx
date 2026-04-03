import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../core/api/client'
import { Download, Play, Pause, CheckCircle2 } from 'lucide-react'

const PRAHA_DISTRICTS = [
  '', 'Praha 1', 'Praha 2', 'Praha 3', 'Praha 4', 'Praha 5', 'Praha 6', 'Praha 7',
  'Praha 8', 'Praha 9', 'Praha 10', 'Praha 11', 'Praha 12', 'Praha 13', 'Praha 14',
  'Praha 15', 'Praha 16', 'Praha 17', 'Praha 18', 'Praha 19', 'Praha 20', 'Praha 21', 'Praha 22',
]

const card: React.CSSProperties = { background: 'var(--card-bg, #fff)', borderRadius: 12, border: '1px solid var(--border, #e5e7eb)', padding: 20 }
const inputStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border, #d1d5db)', fontSize: '0.82rem', background: 'var(--input-bg, #fff)' }
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--primary, #0d9488)', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
const btnSmall: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }

interface BulkJob {
  id: string; status: string; step: string; region: string; district?: string
  totalEstimated: number; processed: number; created: number; errors: number
  currentBuilding?: string; currentStep?: string; avgQuality?: number; error?: string
}

export default function CrmImportPage() {
  const qc = useQueryClient()
  const [city] = useState('Praha')
  const [district, setDistrict] = useState('')

  const { data: jobs = [] } = useQuery<BulkJob[]>({
    queryKey: ['crm-import-jobs'],
    queryFn: () => apiClient.get('/knowledge-base/bulk-import/jobs').then(r => r.data),
    refetchInterval: 2000,
  })

  const fullJob = jobs.find(j => j.step === 'FULL' && j.region === city)
  const isRunning = fullJob?.status === 'RUNNING'
  const isPaused = fullJob?.status === 'PAUSED'
  const isCompleted = fullJob?.status === 'COMPLETED'
  const isFailed = fullJob?.status === 'FAILED'
  const pct = fullJob && fullJob.totalEstimated > 0 ? Math.round((fullJob.processed / fullJob.totalEstimated) * 100) : 0

  const startMut = useMutation({
    mutationFn: () => apiClient.post('/knowledge-base/bulk-import/full', { region: city, district: district || undefined }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-import-jobs'] }),
  })
  const pauseMut = useMutation({
    mutationFn: (id: string) => apiClient.post(`/knowledge-base/bulk-import/${id}/pause`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-import-jobs'] }),
  })
  const resumeMut = useMutation({
    mutationFn: (id: string) => apiClient.post(`/knowledge-base/bulk-import/${id}/resume`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-import-jobs'] }),
  })

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Download size={22} />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Import dat</h1>
      </div>

      <div style={card}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>Kompletní sekvenční import</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Pro každou budovu: RÚIAN (adresa, GPS) → ARES (SVJ/BD) → Enrichment (cena, rizika, POI) → Justice.cz (OR, sbírka listin)
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <select value={district} onChange={e => setDistrict(e.target.value)} style={inputStyle} disabled={isRunning}>
            <option value="">Všechny městské části</option>
            {PRAHA_DISTRICTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {!isRunning && !isPaused && (
            <button style={btnPrimary} onClick={() => startMut.mutate()} disabled={startMut.isPending}>
              <Play size={14} /> Spustit import
            </button>
          )}
          {isRunning && <button style={btnSmall} onClick={() => pauseMut.mutate(fullJob!.id)}><Pause size={14} /> Pozastavit</button>}
          {isPaused && <button style={btnSmall} onClick={() => resumeMut.mutate(fullJob!.id)}><Play size={14} /> Pokračovat</button>}
        </div>

        {fullJob && (
          <div style={{ padding: 16, background: 'var(--border-light, #f9fafb)', borderRadius: 10 }}>
            {isRunning && fullJob.currentBuilding && (
              <div style={{ fontSize: '0.82rem', fontWeight: 500, marginBottom: 8 }}>
                Zpracovávám: {fullJob.currentBuilding}
                {fullJob.currentStep && <span style={{ color: 'var(--primary)', marginLeft: 8 }}>[{fullJob.currentStep}]</span>}
              </div>
            )}

            <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: 5, transition: 'width 0.5s',
                background: isRunning ? 'var(--primary)' : isPaused ? 'var(--warning)' : isFailed ? 'var(--danger)' : 'var(--success)',
              }} />
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>{fullJob.processed.toLocaleString('cs-CZ')} / {fullJob.totalEstimated.toLocaleString('cs-CZ')} ({pct}%)</span>
              <span>{fullJob.created} vytvořeno</span>
              {fullJob.avgQuality !== undefined && <span>Avg Q: {fullJob.avgQuality}</span>}
              {fullJob.errors > 0 && <span style={{ color: 'var(--danger)' }}>{fullJob.errors} chyb</span>}
            </div>

            {isFailed && fullJob.error && <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--danger)' }}>{fullJob.error}</div>}
            {isCompleted && (
              <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>
                <CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Import dokončen
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
