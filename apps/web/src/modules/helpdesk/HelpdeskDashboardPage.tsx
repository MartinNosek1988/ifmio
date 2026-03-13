import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { KpiCard, Badge, Button, LoadingState, ErrorState } from '../../shared/components'
import type { BadgeVariant } from '../../shared/components'
import { useDashboard } from './api/helpdesk.queries'
import type { DashboardData } from './api/helpdesk.api'

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Nízká', medium: 'Normální', high: 'Vysoká', urgent: 'Urgentní',
}
const PRIO_COLOR: Record<string, BadgeVariant> = {
  low: 'muted', medium: 'blue', high: 'yellow', urgent: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Otevřený', in_progress: 'V řešení', resolved: 'Vyřešený', closed: 'Uzavřený',
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dní' },
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
]

export default function HelpdeskDashboardPage() {
  const [days, setDays] = useState(30)
  const navigate = useNavigate()
  const { data, isLoading, error } = useDashboard(days)

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState message="Nepodařilo se načíst dashboard." />

  const { kpi, byPriority, byProperty, trend, topRisk } = data

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/helpdesk')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            title="Zpět na tikety"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">HelpDesk Dashboard</h1>
            <p className="page-subtitle">SLA přehled a výkonnost</p>
          </div>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={selectStyle}>
          {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Otevřených" value={String(kpi.open)} color="var(--accent-blue)" />
        <KpiCard label="Po termínu" value={String(kpi.overdue)} color="var(--accent-red, var(--danger))" />
        <KpiCard label="Eskalovaných" value={String(kpi.escalated)} color="var(--accent-orange)" />
        <KpiCard
          label="SLA compliance"
          value={`${kpi.slaCompliancePct}%`}
          color={kpi.slaCompliancePct >= 90 ? 'var(--accent-green)' : kpi.slaCompliancePct >= 70 ? 'var(--accent-yellow, #e6a817)' : 'var(--accent-red, var(--danger))'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Vytvořeno" value={String(kpi.createdInPeriod)} color="var(--accent-blue)" />
        <KpiCard label="Vyřešeno" value={String(kpi.resolvedInPeriod)} color="var(--accent-green)" />
        <KpiCard label="Blíží se termín" value={String(kpi.dueSoon)} color="var(--accent-yellow, #e6a817)" />
        <KpiCard label="Celkem tiketů" value={String(kpi.total)} color="var(--text-muted)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Trend chart */}
        <DashboardCard title={`Trend (${days} dní)`}>
          <TrendChart trend={trend} />
        </DashboardCard>

        {/* By priority */}
        <DashboardCard title="Podle priority">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Priorita</th>
                <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Otevřených</th>
                <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Vytvořeno</th>
              </tr>
            </thead>
            <tbody>
              {byPriority.map((p) => (
                <tr key={p.priority} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0' }}>
                    <Badge variant={PRIO_COLOR[p.priority] || 'muted'}>
                      {PRIORITY_LABELS[p.priority] || p.priority}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>{p.open}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* By property */}
        <DashboardCard title="Podle nemovitosti">
          {byProperty.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>Žádná data</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Nemovitost</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Tiketů</th>
                </tr>
              </thead>
              <tbody>
                {byProperty.map((p, i) => (
                  <tr key={p.propertyId ?? i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DashboardCard>

        {/* Top risk */}
        <DashboardCard title="Nejrizikovější tikety">
          {topRisk.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>Žádné po termínu</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topRisk.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate('/helpdesk')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2, var(--surface))',
                  }}
                >
                  <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.8rem', flexShrink: 0 }}>
                    HD-{String(t.number).padStart(4, '0')}
                  </span>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                  <Badge variant={PRIO_COLOR[t.priority] || 'muted'}>
                    {PRIORITY_LABELS[t.priority] || t.priority}
                  </Badge>
                  {t.escalationLevel > 0 && (
                    <Badge variant="red">L{t.escalationLevel}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}

function DashboardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10,
      padding: 16, background: 'var(--card-bg, var(--surface))',
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function TrendChart({ trend }: { trend: DashboardData['trend'] }) {
  if (trend.length === 0) return <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>Žádná data</div>

  const maxVal = Math.max(...trend.map((d) => Math.max(d.created, d.resolved)), 1)
  const barHeight = 120
  const barWidth = Math.max(4, Math.min(16, Math.floor(300 / trend.length)))

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2,
        height: barHeight, padding: '0 4px',
      }}>
        {trend.map((d) => (
          <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }} title={`${d.date}: ${d.created} vytvořeno, ${d.resolved} vyřešeno`}>
            <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: barHeight }}>
              <div style={{
                width: barWidth / 2, borderRadius: '2px 2px 0 0',
                height: Math.max(1, (d.created / maxVal) * barHeight),
                background: 'var(--accent-blue, #3b82f6)',
              }} />
              <div style={{
                width: barWidth / 2, borderRadius: '2px 2px 0 0',
                height: Math.max(1, (d.resolved / maxVal) * barHeight),
                background: 'var(--accent-green, #22c55e)',
              }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span className="text-muted" style={{ fontSize: '0.7rem' }}>{trend[0]?.date}</span>
        <span className="text-muted" style={{ fontSize: '0.7rem' }}>{trend[trend.length - 1]?.date}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        <LegendDot color="var(--accent-blue, #3b82f6)" label="Vytvořeno" />
        <LegendDot color="var(--accent-green, #22c55e)" label="Vyřešeno" />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{label}</span>
    </div>
  )
}
