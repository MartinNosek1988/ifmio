import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { KpiCard, Badge, Button, LoadingState, ErrorState } from '../../shared/components'
import type { BadgeVariant } from '../../shared/components'
import { useRevisionDashboard } from './api/revisions.queries'
import type { ApiRevisionPlan } from './api/revisions.api'

const COMPLIANCE_LABEL: Record<string, string> = {
  compliant: 'V pořádku', due_soon: 'Blíží se', overdue: 'Po termínu', overdue_critical: 'Kritické',
  performed_pending_protocol: 'Bez protokolu', performed_pending_signature: 'Čeká podpis', performed_unconfirmed: 'Nepotvrzeno',
}
const COMPLIANCE_COLOR: Record<string, BadgeVariant> = {
  compliant: 'green', due_soon: 'yellow', overdue: 'red', overdue_critical: 'red',
  performed_pending_protocol: 'yellow', performed_pending_signature: 'yellow', performed_unconfirmed: 'muted',
}

export default function RevisionDashboardPage() {
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const { data, isLoading, error } = useRevisionDashboard(days)

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState message="Nepodařilo se načíst dashboard." />

  const { kpi, byType, byProperty, upcoming, topRisk } = data
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'

  const selectStyle = {
    padding: '6px 10px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button size="sm" onClick={() => navigate('/revisions')}><ArrowLeft size={15} /></Button>
          <div>
            <h1 className="page-title">Dashboard revizí</h1>
            <p className="page-subtitle">Přehled compliance stavu</p>
          </div>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={selectStyle}>
          <option value={30}>Posledních 30 dní</option>
          <option value={60}>Posledních 60 dní</option>
          <option value={90}>Posledních 90 dní</option>
          <option value={365}>Posledních 365 dní</option>
        </select>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 16 }}>
        <KpiCard label="Celkem plánů" value={String(kpi.totalPlans)} color="var(--accent-blue)" />
        <KpiCard label="V pořádku" value={String(kpi.compliant)} color="var(--accent-green, #22c55e)" />
        <KpiCard label="Blíží se" value={String(kpi.dueSoon)} color="var(--accent-yellow, #e6a817)" />
        <KpiCard label="Po termínu" value={String(kpi.overdue + (kpi.overdueCritical ?? 0))} color="var(--accent-red, var(--danger))" />
        <KpiCard label="Provedeno za období" value={String(kpi.performedInPeriod)} color="var(--accent-blue)" />
      </div>
      {((kpi.pendingProtocol ?? 0) > 0 || (kpi.pendingSignature ?? 0) > 0 || (kpi.unconfirmed ?? 0) > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          <KpiCard label="Bez protokolu" value={String(kpi.pendingProtocol ?? 0)} color="var(--accent-yellow, #e6a817)" />
          <KpiCard label="Čeká podpis" value={String(kpi.pendingSignature ?? 0)} color="var(--accent-yellow, #e6a817)" />
          <KpiCard label="Nepotvrzeno" value={String(kpi.unconfirmed ?? 0)} color="var(--accent-blue)" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* By Type */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Podle typu revize</h3>
          {byType.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>Žádná data</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Typ</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Celkem</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Po termínu</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Blíží se</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((r) => (
                  <tr key={r.revisionTypeId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 0', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{r.total}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>
                      {r.overdue > 0 ? <Badge variant="red">{r.overdue}</Badge> : '0'}
                    </td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>
                      {r.dueSoon > 0 ? <Badge variant="yellow">{r.dueSoon}</Badge> : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* By Property */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Podle objektu</h3>
          {byProperty.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>Žádná data</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }} className="text-muted">Objekt</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Celkem</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Po termínu</th>
                  <th style={{ textAlign: 'right', padding: '6px 0' }} className="text-muted">Blíží se</th>
                </tr>
              </thead>
              <tbody>
                {byProperty.map((r) => (
                  <tr key={r.propertyId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 0', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{r.total}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>
                      {r.overdue > 0 ? <Badge variant="red">{r.overdue}</Badge> : '0'}
                    </td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>
                      {r.dueSoon > 0 ? <Badge variant="yellow">{r.dueSoon}</Badge> : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Upcoming */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Nadcházející revize</h3>
          <PlanList plans={upcoming} fmtDate={fmtDate} />
        </div>

        {/* Top Risk */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Nejvyšší riziko</h3>
          <PlanList plans={topRisk} fmtDate={fmtDate} />
        </div>
      </div>
    </div>
  )
}

function PlanList({ plans, fmtDate }: { plans: ApiRevisionPlan[]; fmtDate: (d: string | null) => string }) {
  if (!plans || plans.length === 0) {
    return <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>Žádné záznamy</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {plans.map((p) => {
        const cs = p.complianceStatus ?? 'compliant'
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <Badge variant={COMPLIANCE_COLOR[cs]}>{COMPLIANCE_LABEL[cs] || cs}</Badge>
            <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>{p.title}</span>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{fmtDate(p.nextDueAt)}</span>
          </div>
        )
      })}
    </div>
  )
}
