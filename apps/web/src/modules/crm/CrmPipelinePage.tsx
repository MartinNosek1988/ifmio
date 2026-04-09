import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus } from 'lucide-react'
import { KpiCard } from '../../shared/components/KpiCard'
import { Badge } from '../../shared/components/Badge'
import type { BadgeVariant } from '../../shared/components/Badge'
import { LoadingSpinner } from '../../shared/components'
import { formatKc } from '../../shared/utils/format'
import { crmPipelineApi } from './api/crm-pipeline.api'
import type { CrmLead, KanbanColumn } from './api/crm-pipeline.api'
import CrmLeadModal from './CrmLeadModal'

// ── Labels & colors ──────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'Novy',
  contacted: 'Kontaktovan',
  demo_scheduled: 'Demo plan.',
  demo_done: 'Demo OK',
  trial: 'Trial',
  negotiation: 'Jednani',
  won: 'Zakaznik',
  lost: 'Prohrane',
  not_interested: 'Nezajem',
}

const STAGE_COLORS: Record<string, string> = {
  new_lead: '#6b7280',
  contacted: '#3b82f6',
  demo_scheduled: '#a855f7',
  demo_done: '#6366f1',
  trial: '#eab308',
  negotiation: '#f97316',
  won: '#22c55e',
  lost: '#ef4444',
  not_interested: '#6b7280',
}

const STAGE_BADGE: Record<string, BadgeVariant> = {
  new_lead: 'muted',
  contacted: 'blue',
  demo_scheduled: 'purple',
  demo_done: 'purple',
  trial: 'yellow',
  negotiation: 'yellow',
  won: 'green',
  lost: 'red',
  not_interested: 'muted',
}

const LEAD_TYPE_LABELS: Record<string, string> = {
  property_manager: 'Spravce',
  svj_direct: 'SVJ',
  bd_direct: 'BD',
  other: 'Jiny',
}

const PRIORITY_BADGE: Record<string, BadgeVariant> = {
  low: 'muted',
  medium: 'yellow',
  high: 'red',
}

const ACTIVE_STAGES = ['new_lead', 'contacted', 'demo_scheduled', 'demo_done', 'trial', 'negotiation']

// ── Styles ───────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--card-bg, #fff)',
  borderRadius: 12,
  border: '1px solid var(--border, #e5e7eb)',
  padding: 20,
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--border, #d1d5db)',
  fontSize: '0.82rem',
  background: 'var(--input-bg, #fff)',
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  fontSize: '0.85rem',
  background: active ? 'var(--primary, #6366f1)' : 'transparent',
  color: active ? '#fff' : 'var(--text-muted)',
})

// ── Component ─────────────────────────────────────

export default function CrmPipelinePage() {
  const [tab, setTab] = useState<'kanban' | 'table'>('kanban')
  const [modalLeadId, setModalLeadId] = useState<string | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  // Table filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStage, setFilterStage] = useState('')

  const openModal = (leadId?: string) => {
    setModalLeadId(leadId)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalLeadId(undefined)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--card-bg, #f3f4f6)', borderRadius: 10, padding: 3 }}>
          <button style={tabBtn(tab === 'kanban')} onClick={() => setTab('kanban')}>Kanban</button>
          <button style={tabBtn(tab === 'table')} onClick={() => setTab('table')}>Tabulka</button>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn--primary btn--sm"
          onClick={() => openModal()}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Plus size={15} /> Novy lead
        </button>
      </div>

      {tab === 'kanban' ? (
        <KanbanView onCardClick={openModal} />
      ) : (
        <TableView
          search={search}
          setSearch={setSearch}
          filterType={filterType}
          setFilterType={setFilterType}
          filterPriority={filterPriority}
          setFilterPriority={setFilterPriority}
          filterStage={filterStage}
          setFilterStage={setFilterStage}
          onRowClick={openModal}
        />
      )}

      {modalOpen && (
        <CrmLeadModal
          leadId={modalLeadId}
          onClose={closeModal}
          onSaved={closeModal}
        />
      )}
    </div>
  )
}

// ── Kanban View ──────────────────────────────────

function KanbanView({ onCardClick }: { onCardClick: (id: string) => void }) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['crm-pipeline', 'stats'],
    queryFn: crmPipelineApi.stats,
  })

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ['crm-pipeline', 'kanban'],
    queryFn: () => crmPipelineApi.kanban(),
  })

  if (statsLoading || kanbanLoading) return <LoadingSpinner />

  // Transform kanban response (array of { stage, leads, count, totalMrr }) to KanbanColumn[]
  const columns: KanbanColumn[] = Array.isArray(kanbanData)
    ? kanbanData.map((g: any) => ({ stage: g.stage, leads: g.leads ?? [], count: g.count ?? 0, totalMrr: g.totalMrr ?? 0 }))
    : kanbanData?.columns ?? []

  // Extract stats from byStage array
  const getStageCount = (stage: string) => (stats?.byStage ?? []).find((s: any) => s.stage === stage)?.count ?? 0
  const totalLeads = (stats?.byStage ?? []).reduce((sum: number, s: any) => sum + (s.count ?? 0), 0)

  return (
    <>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard label="Celkem leadu" value={String(totalLeads)} color="var(--accent-blue)" />
        <KpiCard label="Demo naplanovane" value={String(getStageCount('demo_scheduled'))} color="#a855f7" />
        <KpiCard label="V trialu" value={String(getStageCount('trial'))} color="#eab308" />
        <KpiCard label="Zakaznici" value={String(stats?.wonCount ?? 0)} color="#22c55e" />
        <KpiCard label="Pipeline MRR" value={formatKc(stats?.totalPipelineMrr ?? 0)} color="#f97316" />
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {ACTIVE_STAGES.map((stage) => {
          const col = columns.find((c) => c.stage === stage)
          return (
            <div key={stage} style={{ minWidth: 260, flex: '1 0 260px' }}>
              {/* Column header */}
              <div
                style={{
                  ...card,
                  padding: '10px 14px',
                  marginBottom: 8,
                  borderLeft: `3px solid ${STAGE_COLORS[stage] ?? '#6b7280'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {STAGE_LABELS[stage] ?? stage}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {col?.count ?? 0} | {formatKc(col?.totalMrr ?? 0)}
                </span>
              </div>
              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(col?.leads ?? []).map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead.id)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function LeadCard({ lead, onClick }: { lead: CrmLead; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...card,
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{lead.companyName}</div>
      {lead.ico && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          IC: {lead.ico}
        </div>
      )}
      {lead.city && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.city}</div>
      )}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Badge variant={STAGE_BADGE[lead.leadType] ?? 'muted'}>
          {LEAD_TYPE_LABELS[lead.leadType] ?? lead.leadType}
        </Badge>
        <Badge variant={PRIORITY_BADGE[lead.priority] ?? 'muted'}>
          {lead.priority}
        </Badge>
      </div>
      {lead.estimatedUnits != null && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {lead.estimatedUnits} jednotek
        </div>
      )}
    </div>
  )
}

// ── Table View ───────────────────────────────────

interface TableViewProps {
  search: string
  setSearch: (v: string) => void
  filterType: string
  setFilterType: (v: string) => void
  filterPriority: string
  setFilterPriority: (v: string) => void
  filterStage: string
  setFilterStage: (v: string) => void
  onRowClick: (id: string) => void
}

function TableView({
  search,
  setSearch,
  filterType,
  setFilterType,
  filterPriority,
  setFilterPriority,
  filterStage,
  setFilterStage,
  onRowClick,
}: TableViewProps) {
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (filterType) params.leadType = filterType
  if (filterPriority) params.priority = filterPriority
  if (filterStage) params.stage = filterStage

  const { data, isLoading } = useQuery({
    queryKey: ['crm-pipeline', 'list', params],
    queryFn: () => crmPipelineApi.list(params),
  })

  const leads: CrmLead[] = data?.data ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filters */}
      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: 'var(--text-muted)' }} />
          <input
            style={{ ...inputStyle, paddingLeft: 28, width: '100%' }}
            placeholder="Hledat firmu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select style={inputStyle} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Vsechny typy</option>
          {Object.entries(LEAD_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select style={inputStyle} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">Vsechny priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select style={inputStyle} value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="">Vsechny stage</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Firma</th>
                <th>ICO</th>
                <th>Typ</th>
                <th>Stage</th>
                <th>Priorita</th>
                <th>Jednotky</th>
                <th>Est. MRR</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => onRowClick(lead.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 600 }}>{lead.companyName}</td>
                  <td>{lead.ico ?? '-'}</td>
                  <td>
                    <Badge variant="muted">
                      {LEAD_TYPE_LABELS[lead.leadType] ?? lead.leadType}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={STAGE_BADGE[lead.stage] ?? 'muted'}>
                      {STAGE_LABELS[lead.stage] ?? lead.stage}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={PRIORITY_BADGE[lead.priority] ?? 'muted'}>
                      {lead.priority}
                    </Badge>
                  </td>
                  <td>{lead.estimatedUnits ?? '-'}</td>
                  <td>{lead.estimatedMrr != null ? formatKc(lead.estimatedMrr) : '-'}</td>
                  <td>
                    {lead.nextFollowUpAt
                      ? new Date(lead.nextFollowUpAt).toLocaleDateString('cs-CZ')
                      : '-'}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    Zadne leady
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
