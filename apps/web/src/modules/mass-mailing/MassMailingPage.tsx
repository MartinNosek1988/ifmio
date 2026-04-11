import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Table, KpiCard, LoadingSkeleton, EmptyState } from '../../shared/components'
import type { Column, BadgeVariant } from '../../shared/components'
import { massMailingApi, type ApiCampaign } from './api/mass-mailing.api'
import { MassMailingForm } from './MassMailingForm'

const STATUS_CONFIG: Record<string, { label: string; color: BadgeVariant }> = {
  draft: { label: 'Koncept', color: 'muted' },
  scheduled: { label: 'Naplánováno', color: 'blue' },
  sending: { label: 'Odesílání', color: 'yellow' },
  sent: { label: 'Odesláno', color: 'green' },
  cancelled: { label: 'Zrušeno', color: 'red' },
}

const CHANNEL_CONFIG: Record<string, { label: string; color: BadgeVariant }> = {
  email: { label: 'Email', color: 'blue' },
  sms: { label: 'SMS', color: 'purple' },
  both: { label: 'Email + SMS', color: 'blue' },
}

const RECIPIENT_TYPE_LABELS: Record<string, string> = {
  all_owners: 'Vlastníci',
  all_tenants: 'Nájemníci',
  all_residents: 'Všichni',
  debtors: 'Dlužníci',
  custom: 'Vlastní',
}

export default function MassMailingPage() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')

  const params: Record<string, any> = {}
  if (statusFilter) params.status = statusFilter
  if (channelFilter) params.channel = channelFilter

  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['mass-mailing', 'list', params],
    queryFn: () => massMailingApi.list(params),
  })
  const campaigns: ApiCampaign[] = Array.isArray(rawData) ? rawData : rawData?.items ?? []

  const { data: stats } = useQuery({
    queryKey: ['mass-mailing', 'stats'],
    queryFn: () => massMailingApi.stats(),
  })

  const columns: Column<ApiCampaign>[] = [
    {
      key: 'name',
      label: 'Název',
      render: (c) => <span style={{ fontWeight: 500 }}>{c.name}</span>,
    },
    {
      key: 'channel',
      label: 'Kanál',
      render: (c) => {
        const cfg = CHANNEL_CONFIG[c.channel] ?? { label: c.channel, color: 'muted' as BadgeVariant }
        return <Badge variant={cfg.color}>{cfg.label}</Badge>
      },
    },
    {
      key: 'recipientType',
      label: 'Segment',
      render: (c) => <span className="text-muted text-sm">{RECIPIENT_TYPE_LABELS[c.recipientType] ?? c.recipientType}</span>,
    },
    {
      key: 'totalRecipients',
      label: 'Příjemci',
      render: (c) => <span>{c.totalRecipients}</span>,
    },
    {
      key: 'status',
      label: 'Stav',
      render: (c) => {
        const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, color: 'muted' as BadgeVariant }
        return <Badge variant={cfg.color}>{cfg.label}</Badge>
      },
    },
    {
      key: 'createdAt',
      label: 'Datum',
      render: (c) => (
        <span className="text-muted text-sm">
          {new Date(c.sentAt ?? c.createdAt).toLocaleString('cs-CZ', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
  ]

  return (
    <div data-testid="mass-mailing-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hromadná pošta</h1>
          <p className="page-subtitle">{campaigns.length} kampaní</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
          Nová kampaň
        </Button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Kampaní celkem"
          value={String(stats?.total ?? 0)}
          color="var(--accent-blue)"
        />
        <KpiCard
          label="Odesláno tento měsíc"
          value={String(stats?.sentThisMonth ?? 0)}
          color="var(--accent-green, #22c55e)"
        />
        <KpiCard
          label="Průměrná úspěšnost"
          value={`${stats?.avgSuccessRate ?? 0} %`}
          color="var(--accent-purple, #8b5cf6)"
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: 6,
            border: '1px solid var(--border, #e5e7eb)',
            background: 'var(--bg-card, #fff)',
            color: 'var(--text)', fontSize: '0.85rem',
          }}
        >
          <option value="">Všechny stavy</option>
          <option value="draft">Koncept</option>
          <option value="scheduled">Naplánováno</option>
          <option value="sending">Odesílání</option>
          <option value="sent">Odesláno</option>
          <option value="cancelled">Zrušeno</option>
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: 6,
            border: '1px solid var(--border, #e5e7eb)',
            background: 'var(--bg-card, #fff)',
            color: 'var(--text)', fontSize: '0.85rem',
          }}
        >
          <option value="">Všechny kanály</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="both">Email + SMS</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSkeleton variant="table" rows={8} />
      ) : campaigns.length === 0 ? (
        <EmptyState title="Žádné kampaně" description="Zatím nebyla vytvořena žádná kampaň." />
      ) : (
        <Table
          data={campaigns}
          columns={columns}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/mass-mailing/${c.id}`)}
          data-testid="mass-mailing-table"
        />
      )}

      {/* Create form modal */}
      <MassMailingForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => { setShowForm(false); refetch() }}
      />
    </div>
  )
}
