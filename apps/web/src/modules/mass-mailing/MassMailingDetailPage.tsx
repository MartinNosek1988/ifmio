import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, XCircle } from 'lucide-react'
import { Badge, Button, Table, KpiCard, LoadingState, ErrorState } from '../../shared/components'
import type { Column, BadgeVariant } from '../../shared/components'
import { massMailingApi, type ApiCampaign, type ApiCampaignRecipient } from './api/mass-mailing.api'

const STATUS_CONFIG: Record<string, { label: string; color: BadgeVariant }> = {
  draft: { label: 'Koncept', color: 'muted' },
  scheduled: { label: 'Naplanovano', color: 'blue' },
  sending: { label: 'Odesilani', color: 'yellow' },
  sent: { label: 'Odeslano', color: 'green' },
  cancelled: { label: 'Zruseno', color: 'red' },
}

const RECIPIENT_STATUS_CONFIG: Record<string, { label: string; color: BadgeVariant }> = {
  pending: { label: 'Ceka', color: 'yellow' },
  sent: { label: 'Odeslano', color: 'green' },
  failed: { label: 'Selhalo', color: 'red' },
  opened: { label: 'Precteno', color: 'blue' },
}

export default function MassMailingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [recipientStatusFilter, setRecipientStatusFilter] = useState('')

  const { data: campaign, isLoading, isError } = useQuery<ApiCampaign>({
    queryKey: ['mass-mailing', id],
    queryFn: () => massMailingApi.getById(id!),
    enabled: !!id,
  })

  const recipientParams: Record<string, any> = {}
  if (recipientStatusFilter) recipientParams.status = recipientStatusFilter

  const { data: recipientsResponse } = useQuery({
    queryKey: ['mass-mailing', id, 'recipients', recipientParams],
    queryFn: () => massMailingApi.recipients(id!, recipientParams),
    enabled: !!id,
  })
  const recipients: ApiCampaignRecipient[] = recipientsResponse?.items ?? recipientsResponse ?? []

  const sendMutation = useMutation({
    mutationFn: () => massMailingApi.send(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mass-mailing', id] }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => massMailingApi.cancel(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mass-mailing', id] }),
  })

  if (isLoading) return <LoadingState text="Nacitani kampane..." />
  if (isError || !campaign) return <ErrorState title="Kampan nenalezena" message="Nelze nacist detail kampane." />

  const statusCfg = STATUS_CONFIG[campaign.status] ?? { label: campaign.status, color: 'muted' as BadgeVariant }
  const progressPct = campaign.totalRecipients > 0
    ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
    : 0
  const pendingCount = campaign.totalRecipients - campaign.sentCount - campaign.failedCount

  const recipientColumns: Column<ApiCampaignRecipient>[] = [
    {
      key: 'name',
      label: 'Jmeno',
      render: (r) => <span style={{ fontWeight: 500 }}>{r.name ?? '—'}</span>,
    },
    {
      key: 'email',
      label: 'Email / Telefon',
      render: (r) => <span className="text-muted text-sm">{r.email ?? r.phone ?? '—'}</span>,
    },
    {
      key: 'status',
      label: 'Stav',
      render: (r) => {
        const cfg = RECIPIENT_STATUS_CONFIG[r.status] ?? { label: r.status, color: 'muted' as BadgeVariant }
        return <Badge variant={cfg.color}>{cfg.label}</Badge>
      },
    },
    {
      key: 'sentAt',
      label: 'Odeslano',
      render: (r) => (
        <span className="text-muted text-sm">
          {r.sentAt ? new Date(r.sentAt).toLocaleString('cs-CZ', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }) : '—'}
        </span>
      ),
    },
    {
      key: 'errorMessage',
      label: 'Chyba',
      render: (r) => r.errorMessage
        ? <span style={{ fontSize: '0.78rem', color: 'var(--danger, #ef4444)' }}>{r.errorMessage}</span>
        : <span className="text-muted">—</span>,
    },
  ]

  return (
    <div data-testid="mass-mailing-detail-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Button variant="default" onClick={() => navigate('/mass-mailing')} icon={<ArrowLeft size={15} />}>
          Zpet
        </Button>
        <h1 className="page-title" style={{ margin: 0, flex: 1, minWidth: 200 }}>{campaign.name}</h1>
        <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
        {campaign.status === 'draft' && (
          <Button
            variant="primary"
            icon={<Send size={15} />}
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
          >
            Odeslat
          </Button>
        )}
        {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
          <Button
            variant="danger"
            icon={<XCircle size={15} />}
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            Zrusit
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>Prubeh odesilani</span>
          <span style={{ fontWeight: 600 }}>{progressPct} %</span>
        </div>
        <div style={{
          width: '100%', height: 8, borderRadius: 4,
          background: 'var(--border, #e5e7eb)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPct}%`, height: '100%', borderRadius: 4,
            background: 'var(--accent-green, #22c55e)',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Odeslano"
          value={String(campaign.sentCount)}
          color="var(--accent-green, #22c55e)"
        />
        <KpiCard
          label="Selhalo"
          value={String(campaign.failedCount)}
          color="var(--danger, #ef4444)"
        />
        <KpiCard
          label="Ceka"
          value={String(pendingCount > 0 ? pendingCount : 0)}
          color="var(--accent-yellow, #eab308)"
        />
      </div>

      {/* Content preview */}
      <div style={{
        marginBottom: 24, padding: '16px 20px', borderRadius: 10,
        border: '1px solid var(--border, #e5e7eb)',
        background: 'var(--bg-card, #fff)',
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>{campaign.subject}</div>
        <div style={{
          fontSize: '0.82rem', color: 'var(--text)',
          maxHeight: 200, overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }}>
          {campaign.body}
        </div>
      </div>

      {/* Recipients section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Prijemci</h2>
        <select
          value={recipientStatusFilter}
          onChange={(e) => setRecipientStatusFilter(e.target.value)}
          style={{
            padding: '4px 10px', borderRadius: 6,
            border: '1px solid var(--border, #e5e7eb)',
            background: 'var(--bg-card, #fff)',
            color: 'var(--text)', fontSize: '0.82rem',
          }}
        >
          <option value="">Vsechny stavy</option>
          <option value="pending">Ceka</option>
          <option value="sent">Odeslano</option>
          <option value="failed">Selhalo</option>
          <option value="opened">Precteno</option>
        </select>
      </div>

      <Table
        data={recipients}
        columns={recipientColumns}
        rowKey={(r) => r.id}
        data-testid="recipients-table"
      />

      {(sendMutation.isError || cancelMutation.isError) && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: 'var(--danger, #ef4444)', fontSize: '0.82rem' }}>
          Akce se nezdarila. Zkuste to prosim znovu.
        </div>
      )}
    </div>
  )
}
