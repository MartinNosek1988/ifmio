import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, label } from '../../constants/labels';
import { useHelpdeskStore } from './helpdesk-store';
import TicketDetailModal from './TicketDetailModal';
import TicketForm from './TicketForm';
import type { Ticket, TicketStatus } from '../../shared/schema/ticket';

type R = Record<string, unknown>;

const STATUS_COLOR: Record<string, BadgeVariant> = {
  new: 'blue', open: 'blue', in_progress: 'yellow', resolved: 'green', closed: 'muted', cancelled: 'red',
};
const PRIO_COLOR: Record<string, BadgeVariant> = {
  low: 'muted', medium: 'blue', high: 'yellow', critical: 'red',
};

export default function HelpdeskPage() {
  const { tickets, load, getStats } = useHelpdeskStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [load]);

  const stats = getStats();

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      const q = search.toLowerCase();
      const extra = t as unknown as R;
      const matchSearch = !search ||
        t.title.toLowerCase().includes(q) ||
        String(extra.zadavatel || '').toLowerCase().includes(q) ||
        (t.kategorie || '').toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [tickets, search, filterStatus]);

  const columns: Column<Ticket>[] = [
    { key: 'cisloProtokolu', label: 'Číslo', render: t => <span className="text-muted text-sm">{String((t as unknown as R).cisloProtokolu || '')}</span> },
    { key: 'title', label: 'Název', render: t => <span style={{ fontWeight: 600 }}>{t.title}</span> },
    { key: 'kategorie', label: 'Kategorie', render: t => t.kategorie ? <Badge variant="blue">{t.kategorie}</Badge> : <span className="text-muted">—</span> },
    { key: 'priority', label: 'Priorita', render: t => <Badge variant={PRIO_COLOR[t.priority] || 'muted'}>{label(TICKET_PRIORITY_LABELS, t.priority)}</Badge> },
    { key: 'status', label: 'Stav', render: t => <Badge variant={STATUS_COLOR[t.status] || 'muted'}>{label(TICKET_STATUS_LABELS, t.status)}</Badge> },
    { key: 'zadavatel', label: 'Zadavatel', render: t => String((t as unknown as R).zadavatel || '—') },
    { key: 'created_date', label: 'Vytvořeno', render: t => <span className="text-muted text-sm">{formatCzDate(t.created_date)}</span> },
  ];

  const handleRowClick = (t: Ticket) => setSelectedTicket(t);

  const refreshAndClose = () => {
    load();
    setSelectedTicket(null);
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
        <KpiCard label="Kritických" value={String(stats.critical)} color="var(--accent-red)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat tikety..." onSearch={setSearch} /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as TicketStatus | 'all')}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
          <option value="all">Všechny stavy</option>
          {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Žádné tikety" description="Vytvořte nový helpdesk tiket." />
      ) : (
        <Table data={filtered} columns={columns} rowKey={t => t.id} onRowClick={handleRowClick} />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdated={refreshAndClose}
        />
      )}

      {showForm && (
        <TicketForm onClose={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
