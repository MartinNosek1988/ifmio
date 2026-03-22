import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, BarChart3, Settings } from 'lucide-react'
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState, LoadingState, ErrorState } from '../../shared/components'
import type { Column, BadgeVariant } from '../../shared/components'
import { useRevisionPlans, useRevisionTypes } from './api/revisions.queries'
import type { ApiRevisionPlan } from './api/revisions.api'
import { useProperties } from '../properties/use-properties'
import RevisionPlanDetailModal from './RevisionPlanDetailModal'
import RevisionPlanForm from './RevisionPlanForm'

const COMPLIANCE_LABEL: Record<string, string> = {
  compliant: 'V pořádku',
  due_soon: 'Blíží se',
  overdue: 'Po termínu',
  overdue_critical: 'Kritické',
  performed_pending_protocol: 'Bez protokolu',
  performed_pending_signature: 'Čeká podpis',
  performed_unconfirmed: 'Nepotvrzeno',
}
const COMPLIANCE_COLOR: Record<string, BadgeVariant> = {
  compliant: 'green',
  due_soon: 'yellow',
  overdue: 'red',
  overdue_critical: 'red',
  performed_pending_protocol: 'yellow',
  performed_pending_signature: 'yellow',
  performed_unconfirmed: 'muted',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Aktivní',
  paused: 'Pozastavený',
  archived: 'Archivovaný',
}

export default function RevisionsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCompliance = searchParams.get('complianceStatus') ?? ''
  const [search, setSearch] = useState('')
  const [filterProperty, setFilterProperty] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCompliance, setFilterCompliance] = useState(initialCompliance)
  const [filterStatus, setFilterStatus] = useState('active')
  const [selectedPlan, setSelectedPlan] = useState<ApiRevisionPlan | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: paginated, isLoading, error } = useRevisionPlans({
    ...(search ? { search } : {}),
    ...(filterProperty ? { propertyId: filterProperty } : {}),
    ...(filterType ? { revisionTypeId: filterType } : {}),
    ...(filterCompliance ? { complianceStatus: filterCompliance } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    limit: 100,
  })

  const { data: types } = useRevisionTypes()
  const { data: properties } = useProperties()

  const plans = paginated?.data ?? []
  const total = paginated?.total ?? 0

  const kpi = {
    total,
    compliant: plans.filter((p) => p.complianceStatus === 'compliant').length,
    dueSoon: plans.filter((p) => p.complianceStatus === 'due_soon').length,
    overdue: plans.filter((p) => p.complianceStatus === 'overdue').length,
  }

  const columns: Column<ApiRevisionPlan>[] = [
    { key: 'title', label: 'Název', render: (p) => <span style={{ fontWeight: 600 }}>{p.title}</span> },
    {
      key: 'property', label: 'Objekt',
      render: (p) => <span className="text-muted">{p.property?.name ?? '—'}</span>,
    },
    {
      key: 'type', label: 'Typ revize',
      render: (p) => p.revisionType ? (
        <Badge variant="blue">{p.revisionType.name}</Badge>
      ) : <span className="text-muted">—</span>,
    },
    {
      key: 'subject', label: 'Předmět',
      render: (p) => <span className="text-muted">{p.revisionSubject?.name ?? '—'}</span>,
    },
    {
      key: 'nextDueAt', label: 'Další termín',
      render: (p) => (
        <span className="text-muted text-sm">
          {new Date(p.nextDueAt).toLocaleDateString('cs-CZ')}
        </span>
      ),
    },
    {
      key: 'compliance', label: 'Stav',
      render: (p) => {
        const cs = p.complianceStatus
        if (!cs) return <span className="text-muted">—</span>
        return <Badge variant={COMPLIANCE_COLOR[cs] || 'muted'}>{COMPLIANCE_LABEL[cs] || cs}</Badge>
      },
    },
    {
      key: 'responsible', label: 'Odpovědný',
      render: (p) => <span className="text-muted">{p.responsibleUser?.name ?? '—'}</span>,
    },
    {
      key: 'vendor', label: 'Dodavatel',
      render: (p) => <span className="text-muted">{p.vendorName ?? '—'}</span>,
    },
  ]

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message="Nepodařilo se načíst revize." />

  const selectStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  }

  return (
    <div data-testid="revisions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Plán činností</h1>
          <p className="page-subtitle">{total} plánů činností</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<BarChart3 size={15} />} onClick={() => navigate('/revisions/dashboard')}>Dashboard</Button>
          <Button icon={<Settings size={15} />} onClick={() => navigate('/revisions/settings')}>Katalog</Button>
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nový plán</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(kpi.total)} color="var(--accent-blue)" />
        <KpiCard label="V pořádku" value={String(kpi.compliant)} color="var(--accent-green, #22c55e)" />
        <KpiCard label="Blíží se" value={String(kpi.dueSoon)} color="var(--accent-yellow, #e6a817)" />
        <KpiCard label="Po termínu" value={String(kpi.overdue)} color="var(--accent-red, var(--danger))" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat revize..." onSearch={setSearch} /></div>
        <select value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)} style={selectStyle}>
          <option value="">Všechny objekty</option>
          {(properties ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
          <option value="">Všechny typy</option>
          {(types ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterCompliance} onChange={(e) => setFilterCompliance(e.target.value)} style={selectStyle}>
          <option value="">Všechny stavy</option>
          {Object.entries(COMPLIANCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Všechny statusy</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {plans.length === 0 ? (
        <EmptyState title="Žádné plány činností" description="Vytvořte nový plán činností nebo přiřaďte plán k zařízení." />
      ) : (
        <Table data={plans} columns={columns} rowKey={(p) => p.id} onRowClick={(p) => setSelectedPlan(p)} />
      )}

      {selectedPlan && (
        <RevisionPlanDetailModal
          planId={selectedPlan.id}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      {showForm && <RevisionPlanForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
