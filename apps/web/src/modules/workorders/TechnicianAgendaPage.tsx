import { useQuery } from '@tanstack/react-query';
import { Wrench, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { Badge, LoadingState, EmptyState } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { apiClient } from '../../core/api/client';
import { useNavigate } from 'react-router-dom';
import type { ApiWorkOrder } from './api/workorders.api';

const STATUS_COLOR: Record<string, BadgeVariant> = {
  nova: 'blue', v_reseni: 'yellow', vyresena: 'green', uzavrena: 'muted', zrusena: 'red',
};
const PRIO_COLOR: Record<string, BadgeVariant> = {
  nizka: 'muted', normalni: 'blue', vysoka: 'yellow', kriticka: 'red',
};

interface AgendaTicket {
  id: string; number: number; title: string; priority: string; status: string;
  property: string | null; asset: string | null; createdAt: string; dueAt: string | null;
}

interface AgendaData {
  today: ApiWorkOrder[];
  overdue: ApiWorkOrder[];
  highPrioTickets: AgendaTicket[];
  overdueTickets: AgendaTicket[];
  counts: { todayWo: number; overdueWo: number; highPrioTickets: number; overdueTickets: number };
}

export default function TechnicianAgendaPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery<AgendaData>({
    queryKey: ['workorders', 'my-agenda'],
    queryFn: () => apiClient.get('/work-orders/my-agenda').then(r => r.data),
  });

  if (isLoading) return <LoadingState text="Načítání agendy..." />;
  if (error) return <EmptyState title="Chyba" description="Nepodařilo se načíst agendu." />;
  if (!data) return null;

  const { counts } = data;
  const totalItems = counts.todayWo + counts.overdueWo + counts.highPrioTickets + counts.overdueTickets;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>Moje dnešní agenda</h1>
      <p className="text-muted" style={{ marginBottom: 20, fontSize: '0.85rem' }}>
        {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <SummaryCard icon={<Clock size={18} />} label="Dnes" count={counts.todayWo} color="var(--accent-blue)" />
        <SummaryCard icon={<AlertTriangle size={18} />} label="Po termínu" count={counts.overdueWo + counts.overdueTickets} color="var(--danger)" />
      </div>

      {totalItems === 0 && (
        <EmptyState title="Vše hotovo" description="Na dnešek nemáte žádné přiřazené úkoly." />
      )}

      {/* Today's WOs */}
      {data.today.length > 0 && (
        <AgendaSection title="Dnešní úkoly" count={data.today.length}>
          {data.today.map(wo => (
            <WoCard key={wo.id} wo={wo} onOpen={() => navigate('/workorders')} />
          ))}
        </AgendaSection>
      )}

      {/* Overdue WOs */}
      {data.overdue.length > 0 && (
        <AgendaSection title="Úkoly po termínu" count={data.overdue.length} variant="danger">
          {data.overdue.map(wo => (
            <WoCard key={wo.id} wo={wo} onOpen={() => navigate('/workorders')} />
          ))}
        </AgendaSection>
      )}

      {/* High priority tickets */}
      {data.highPrioTickets.length > 0 && (
        <AgendaSection title="Prioritní požadavky" count={data.highPrioTickets.length}>
          {data.highPrioTickets.map(t => (
            <TicketCard key={t.id} ticket={t} onOpen={() => navigate('/helpdesk')} />
          ))}
        </AgendaSection>
      )}

      {/* Overdue tickets */}
      {data.overdueTickets.length > 0 && (
        <AgendaSection title="Požadavky po termínu" count={data.overdueTickets.length} variant="danger">
          {data.overdueTickets.map(t => (
            <TicketCard key={t.id} ticket={t} onOpen={() => navigate('/helpdesk')} />
          ))}
        </AgendaSection>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 10, background: 'var(--surface-2, var(--surface))',
      border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{count}</div>
        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{label}</div>
      </div>
    </div>
  );
}

function AgendaSection({ title, count, variant, children }: {
  title: string; count: number; variant?: 'danger'; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        fontSize: '0.9rem', fontWeight: 600, color: variant === 'danger' ? 'var(--danger)' : 'var(--text)',
      }}>
        {title}
        <Badge variant={variant === 'danger' ? 'red' : 'muted'}>{count}</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function WoCard({ wo, onOpen }: { wo: ApiWorkOrder; onOpen: () => void }) {
  return (
    <div onClick={onOpen} style={{
      padding: '12px 14px', borderRadius: 10, background: 'var(--surface)',
      border: '1px solid var(--border)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <Wrench size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wo.title}</div>
        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
          {[wo.property?.name, wo.asset?.name].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        <Badge variant={STATUS_COLOR[wo.status] ?? 'muted'}>{wo.status}</Badge>
        <Badge variant={PRIO_COLOR[wo.priority] ?? 'muted'}>{wo.priority}</Badge>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </div>
  );
}

function TicketCard({ ticket, onOpen }: { ticket: AgendaTicket; onOpen: () => void }) {
  return (
    <div onClick={onOpen} style={{
      padding: '12px 14px', borderRadius: 10, background: 'var(--surface)',
      border: '1px solid var(--border)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <AlertTriangle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          HD-{String(ticket.number).padStart(4, '0')} {ticket.title}
        </div>
        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
          {[ticket.property, ticket.asset].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      <Badge variant={PRIO_COLOR[ticket.priority] ?? 'muted'}>{ticket.priority}</Badge>
      <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </div>
  );
}
