import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart3, Settings } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState, Modal, LoadingState, ErrorState } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { useTickets, useDeleteTicket, useSlaStats, useClaimTicket } from './api/helpdesk.queries';
import type { ApiTicket } from './api/helpdesk.api';
import { useAuthStore } from '../../core/auth/auth.store';
import TicketDetailModal from './TicketDetailModal';
import TicketForm from './TicketForm';

const STATUS_LABELS: Record<string, string> = {
  open: 'Otevřený',
  in_progress: 'V řešení',
  resolved: 'Vyřešený',
  closed: 'Uzavřený',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Nízká',
  medium: 'Normální',
  high: 'Vysoká',
  urgent: 'Urgentní',
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Obecné',
  plumbing: 'Vodovod',
  electrical: 'Elektro',
  hvac: 'Vytápění/VZT',
  structural: 'Stavební',
  cleaning: 'Úklid',
  other: 'Ostatní',
};

const STATUS_COLOR: Record<string, BadgeVariant> = {
  open: 'blue', in_progress: 'yellow', resolved: 'green', closed: 'muted',
};

const PRIO_COLOR: Record<string, BadgeVariant> = {
  low: 'muted', medium: 'blue', high: 'yellow', urgent: 'red',
};

function getSlaStatus(ticket: ApiTicket): { label: string; variant: BadgeVariant } | null {
  const isActive = ticket.status === 'open' || ticket.status === 'in_progress'
  if (!isActive || !ticket.resolutionDueAt) return null
  if (ticket.escalationLevel > 0) return { label: 'Eskalováno', variant: 'red' }
  const now = Date.now()
  const due = new Date(ticket.resolutionDueAt).getTime()
  if (due < now) return { label: 'Po termínu', variant: 'red' }
  if (due - now < 24 * 3_600_000) return { label: 'Blíží se termín', variant: 'yellow' }
  return { label: 'V termínu', variant: 'green' }
}

export default function HelpdeskPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterEscalated, setFilterEscalated] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ApiTicket | null>(null);
  const [deleteTicket, setDeleteTicket] = useState<ApiTicket | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: paginated, isLoading, error } = useTickets({
    ...(search ? { search } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterPriority ? { priority: filterPriority } : {}),
    ...(filterOverdue ? { overdue: 'true' } : {}),
    ...(filterEscalated ? { escalated: 'true' } : {}),
    limit: 100,
  });

  const { data: slaStats } = useSlaStats();

  const deleteMutation = useDeleteTicket();
  const claimMutation = useClaimTicket();
  const currentUser = useAuthStore((s) => s.user);

  const tickets = paginated?.data ?? [];
  const total = paginated?.total ?? 0;

  const stats = useMemo(() => {
    const openStatuses = new Set(['open', 'in_progress']);
    const open = tickets.filter(t => openStatuses.has(t.status)).length;
    const urgent = tickets.filter(t => t.priority === 'urgent' && openStatuses.has(t.status)).length;
    const today = tickets.filter(t => t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
    return { total, open, today, urgent };
  }, [tickets, total]);

  const columns: Column<ApiTicket>[] = [
    {
      key: 'number', label: '#',
      render: (t) => <span className="text-muted text-sm" style={{ fontFamily: 'monospace' }}>HD-{String(t.number).padStart(4, '0')}</span>,
    },
    { key: 'title', label: 'Název', render: (t) => <span style={{ fontWeight: 600 }}>{t.title}</span> },
    {
      key: 'category', label: 'Kategorie',
      render: (t) => <Badge variant="blue">{CATEGORY_LABELS[t.category] || t.category}</Badge>,
    },
    {
      key: 'priority', label: 'Priorita',
      render: (t) => <Badge variant={PRIO_COLOR[t.priority] || 'muted'}>{PRIORITY_LABELS[t.priority] || t.priority}</Badge>,
    },
    {
      key: 'status', label: 'Stav',
      render: (t) => <Badge variant={STATUS_COLOR[t.status] || 'muted'}>{STATUS_LABELS[t.status] || t.status}</Badge>,
    },
    {
      key: 'sla', label: 'SLA',
      render: (t) => {
        const sla = getSlaStatus(t)
        if (!sla) return <span className="text-muted">—</span>
        return <Badge variant={sla.variant}>{sla.label}</Badge>
      },
    },
    {
      key: 'assignee', label: 'Řešitel',
      render: (t) => <span className="text-muted">{t.assignee?.name ?? '—'}</span>,
    },
    {
      key: 'property', label: 'Nemovitost',
      render: (t) => <span className="text-muted">{t.property?.name ?? '—'}</span>,
    },
    {
      key: 'createdAt', label: 'Vytvořeno',
      render: (t) => <span className="text-muted text-sm">{new Date(t.createdAt).toLocaleDateString('cs-CZ')}</span>,
    },
    {
      key: 'actions', label: '',
      render: (t) => {
        const isActive = t.status === 'open' || t.status === 'in_progress'
        if (!isActive || t.assigneeId === currentUser?.id) return null
        return (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); claimMutation.mutate(t.id) }}
            disabled={claimMutation.isPending}
          >
            Převzít
          </Button>
        )
      },
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Nepodařilo se načíst požadavky." />;

  const handleDeleteConfirm = () => {
    if (!deleteTicket) return;
    deleteMutation.mutate(deleteTicket.id, {
      onSuccess: () => {
        setDeleteTicket(null);
        if (selectedTicket?.id === deleteTicket.id) setSelectedTicket(null);
      },
    });
  };

  const selectStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Helpdesk</h1>
          <p className="page-subtitle">{stats.open} otevřených požadavků</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<BarChart3 size={15} />} onClick={() => navigate('/helpdesk/dashboard')}>Dashboard</Button>
          <Button icon={<Settings size={15} />} onClick={() => navigate('/helpdesk/sla-config')}>SLA</Button>
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nový požadavek</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Otevřených" value={String(slaStats?.total ?? stats.open)} color="var(--accent-blue)" />
        <KpiCard label="Po termínu" value={String(slaStats?.overdue ?? 0)} color="var(--accent-red, var(--danger))" />
        <KpiCard label="Eskalovaných" value={String(slaStats?.escalated ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="Blíží se termín" value={String(slaStats?.dueSoon ?? 0)} color="var(--accent-yellow, #e6a817)" />
        <KpiCard label="Urgentních" value={String(stats.urgent)} color="var(--accent-red, var(--danger))" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat požadavky..." onSearch={setSearch} /></div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Všechny stavy</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={selectStyle}>
          <option value="">Všechny priority</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button
          size="sm"
          variant={filterOverdue ? 'danger' : undefined}
          onClick={() => setFilterOverdue(!filterOverdue)}
        >
          Po termínu
        </Button>
        <Button
          size="sm"
          variant={filterEscalated ? 'danger' : undefined}
          onClick={() => setFilterEscalated(!filterEscalated)}
        >
          Eskalované
        </Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="Žádné požadavky" description="Zatím tu nejsou žádné požadavky." />
      ) : (
        <Table data={tickets} columns={columns} rowKey={(t) => t.id} onRowClick={(t) => setSelectedTicket(t)} />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticketId={selectedTicket.id}
          onClose={() => setSelectedTicket(null)}
          onDelete={() => {
            setDeleteTicket(selectedTicket);
            setSelectedTicket(null);
          }}
        />
      )}

      {showForm && (
        <TicketForm onClose={() => setShowForm(false)} />
      )}

      {deleteTicket && (
        <Modal
          open
          onClose={() => setDeleteTicket(null)}
          title="Smazat požadavek"
          subtitle={`HD-${String(deleteTicket.number).padStart(4, '0')} ${deleteTicket.title}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteTicket(null)}>Zrušit</Button>
              <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }
        >
          <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            Opravdu chcete smazat požadavek <strong>{deleteTicket.title}</strong>?
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Tato akce je nevratná. Budou smazány i všechny položky a protokol požadavku.
          </p>
          {deleteMutation.isError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>
              Nepodařilo se smazat požadavek.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
