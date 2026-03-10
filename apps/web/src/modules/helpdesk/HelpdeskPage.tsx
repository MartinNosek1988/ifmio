import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState, Modal, LoadingState, ErrorState } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { useTickets, useDeleteTicket } from './api/helpdesk.queries';
import type { ApiTicket } from './api/helpdesk.api';
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

export default function HelpdeskPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ApiTicket | null>(null);
  const [deleteTicket, setDeleteTicket] = useState<ApiTicket | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: paginated, isLoading, error } = useTickets({
    ...(search ? { search } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterPriority ? { priority: filterPriority } : {}),
    limit: 100,
  });

  const deleteMutation = useDeleteTicket();

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
      key: 'property', label: 'Nemovitost',
      render: (t) => <span className="text-muted">{t.property?.name ?? '—'}</span>,
    },
    {
      key: 'createdAt', label: 'Vytvořeno',
      render: (t) => <span className="text-muted text-sm">{new Date(t.createdAt).toLocaleDateString('cs-CZ')}</span>,
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Nepodařilo se načíst tikety." />;

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
          <h1 className="page-title">HelpDesk</h1>
          <p className="page-subtitle">{stats.open} otevřených tiketů</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nový tiket</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem tiketů" value={String(stats.total)} color="var(--accent-blue)" />
        <KpiCard label="Otevřených" value={String(stats.open)} color="var(--accent-orange)" />
        <KpiCard label="Dnes" value={String(stats.today)} color="var(--accent-green)" />
        <KpiCard label="Urgentních" value={String(stats.urgent)} color="var(--accent-red, var(--danger))" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat tikety..." onSearch={setSearch} /></div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Všechny stavy</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={selectStyle}>
          <option value="">Všechny priority</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="Žádné tikety" description="Vytvořte nový helpdesk tiket." />
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
          title="Smazat tiket"
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
            Opravdu chcete smazat tiket <strong>{deleteTicket.title}</strong>?
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Tato akce je nevratná. Budou smazány i všechny položky a protokol tiketu.
          </p>
          {deleteMutation.isError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>
              Nepodařilo se smazat tiket.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
