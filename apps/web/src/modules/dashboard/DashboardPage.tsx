import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Percent, UserCheck, Headphones, AlertTriangle,
  FileText, Wallet, Plus, Wrench,
} from 'lucide-react';
import { KpiCard, Badge, Button } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { useDashboardOverview } from './api/dashboard.queries';
import { formatKc, formatCzDate } from '../../shared/utils/format';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Nízká', medium: 'Normální', high: 'Vysoká', urgent: 'Urgentní',
};

const PRIO_COLOR: Record<string, 'muted' | 'blue' | 'yellow' | 'red'> = {
  low: 'muted', medium: 'blue', high: 'yellow', urgent: 'red',
};

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardOverview();
  const navigate = useNavigate();

  if (isLoading) return <LoadingState text="Načítání dashboardu..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const { kpi, alerts, recentTransactions, recentTickets } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Přehled správy nemovitostí</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.map((alert: any, i: number) => (
            <div key={i} onClick={() => alert.link && navigate(alert.link)} style={{
              padding: '10px 16px',
              borderRadius: 8,
              marginBottom: 8,
              background: alert.type === 'error'
                ? 'rgba(239,68,68,0.1)'
                : alert.type === 'warning'
                  ? 'rgba(245,158,11,0.1)'
                  : 'rgba(59,130,246,0.1)',
              borderLeft: `4px solid ${
                alert.type === 'error' ? 'var(--danger, #ef4444)'
                : alert.type === 'warning' ? 'var(--accent-orange, #f59e0b)'
                : 'var(--accent-blue, #3b82f6)'
              }`,
              color: 'var(--text)',
              fontSize: '0.875rem',
              cursor: alert.link ? 'pointer' : 'default',
            }}>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI Row 1: Properties */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 16 }}>
        <KpiCard
          label="Nemovitosti"
          value={String(kpi.propertiesCount)}
          color="var(--accent-blue)"
          icon={<Building2 size={18} />}
        />
        <KpiCard
          label="Jednotky"
          value={String(kpi.unitsCount)}
          color="var(--accent-blue)"
          icon={<Users size={18} />}
        />
        <KpiCard
          label="Obsazenost"
          value={`${kpi.occupancyRate}%`}
          color={kpi.occupancyRate >= 80 ? 'var(--accent-green)' : 'var(--accent-orange)'}
          icon={<Percent size={18} />}
        />
        <KpiCard
          label="Aktivní obyvatelé"
          value={String(kpi.residentsCount)}
          color="var(--accent-green)"
          icon={<UserCheck size={18} />}
        />
      </div>

      {/* KPI Row 2: Operations & Finance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Otevřené tickety"
          value={String(kpi.openTickets)}
          color={kpi.openTickets > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'}
          icon={<Headphones size={18} />}
        />
        <KpiCard
          label="Urgentní tickety"
          value={String(kpi.urgentTickets)}
          color={kpi.urgentTickets > 0 ? 'var(--accent-red, var(--danger))' : 'var(--accent-green)'}
          icon={<AlertTriangle size={18} />}
        />
        <KpiCard
          label="Aktivní předpisy"
          value={String(kpi.activePrescriptions)}
          color="var(--accent-blue)"
          icon={<FileText size={18} />}
        />
        <KpiCard
          label="Měsíční objem"
          value={formatKc(kpi.monthlyPrescriptionVolume ?? 0)}
          color="var(--accent-green)"
          icon={<Wallet size={18} />}
        />
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24,
        padding: '12px 16px', background: 'var(--surface-2, var(--surface))',
        borderRadius: 8, border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: 8 }}>
          Rychlé akce:
        </span>
        <Button icon={<Plus size={14} />} onClick={() => navigate('/properties?action=new')}>
          Nová nemovitost
        </Button>
        <Button icon={<Headphones size={14} />} onClick={() => navigate('/helpdesk?action=new')}>
          Nový tiket
        </Button>
        <Button icon={<FileText size={14} />} onClick={() => navigate('/finance?tab=prescriptions')}>
          Nový předpis
        </Button>
        <Button icon={<Wrench size={14} />} onClick={() => navigate('/workorders?action=new')}>
          Nový work order
        </Button>
      </div>

      {/* Recent Activity: Tickets + Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Tickets */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Poslední tickety</h2>
            <Button size="sm" onClick={() => navigate('/helpdesk')}>Zobrazit vše</Button>
          </div>
          {recentTickets.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>
              Žádné otevřené tickety
            </div>
          ) : (
            recentTickets.map((t: any) => (
              <div key={t.id} onClick={() => navigate('/helpdesk')} style={{
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginRight: 8 }}>
                      HD-{String(t.number).padStart(4, '0')}
                    </span>
                    <span style={{ fontWeight: 500 }}>{t.title}</span>
                  </div>
                  <Badge variant={PRIO_COLOR[t.priority] || 'muted'}>
                    {PRIORITY_LABELS[t.priority] || t.priority}
                  </Badge>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 3 }}>
                  {t.property?.name ?? '—'} &middot; {formatCzDate(t.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Transactions */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Poslední transakce</h2>
            <Button size="sm" onClick={() => navigate('/finance?tab=bank')}>Zobrazit vše</Button>
          </div>
          {recentTransactions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>
              Žádné transakce
            </div>
          ) : (
            recentTransactions.map((t: any) => (
              <div key={t.id} onClick={() => navigate('/finance?tab=bank')} style={{
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.875rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{t.description ?? t.counterparty ?? '—'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                    {formatCzDate(t.date)}
                    {t.variableSymbol && <span> &middot; VS: {t.variableSymbol}</span>}
                  </div>
                </div>
                <div style={{
                  fontWeight: 600,
                  color: t.type === 'credit' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
                  whiteSpace: 'nowrap',
                }}>
                  {t.type === 'credit' ? '+' : '-'}{formatKc(Number(t.amount))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
