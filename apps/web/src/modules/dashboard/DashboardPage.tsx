import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Percent, UserCheck, Headphones, AlertTriangle,
  FileText, Wallet, Wrench, Clock, CheckCircle, Calendar, ClipboardCheck,
  MessageSquare, Search, Lightbulb, Shield, BarChart3,
} from 'lucide-react';
import { KpiCard, Badge, Button } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDashboardOverview, useOperationalDashboard } from './api/dashboard.queries';
import { formatKc, formatCzDate } from '../../shared/utils/format';
import { useRoleUX } from '../../shared/hooks/useRoleUX';
import { dashboardApi } from './api/dashboard.api';
import type { OperationalDashboard, MioFinding } from './api/dashboard.api';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Nízká', medium: 'Normální', high: 'Vysoká', urgent: 'Urgentní',
  nizka: 'Nízká', normalni: 'Normální', vysoka: 'Vysoká', kriticka: 'Kritická',
};
const PRIO_COLOR: Record<string, 'muted' | 'blue' | 'yellow' | 'red'> = {
  low: 'muted', medium: 'blue', high: 'yellow', urgent: 'red',
  nizka: 'muted', normalni: 'blue', vysoka: 'yellow', kriticka: 'red',
};

export default function DashboardPage() {
  const uxRole = useRoleUX();
  const { data, isLoading, isError, refetch } = useDashboardOverview();
  const { data: ops } = useOperationalDashboard();
  const navigate = useNavigate();

  if (isLoading) return <LoadingState text="Načítání dashboardu..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const { kpi, alerts, recentTransactions } = data;

  // Technician: lightweight view
  if (uxRole === 'tech') return <TechDashboard ops={ops} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Provoz pod kontrolou</h1>
          <p className="page-subtitle">Co je potřeba řešit dnes</p>
        </div>
      </div>

      {/* ── ATTENTION SECTION (operational) ─────────────────────── */}
      {ops && <AttentionSection ops={ops} uxRole={uxRole} />}

      {/* ── MIO VALUE STRIP ─────────────────────────────────────── */}
      {uxRole !== 'resident' && <MioValueStrip />}

      {/* Mio Findings */}
      {uxRole !== 'resident' && <FindingsSection />}

      {/* Mio Recommendations */}
      {(uxRole === 'fm' || uxRole === 'owner') && <RecommendationsSection />}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.map((alert: any, i: number) => (
            <div key={i} onClick={() => alert.link && navigate(alert.link)} style={{
              padding: '10px 16px', borderRadius: 8, marginBottom: 8,
              background: alert.type === 'error' ? 'rgba(239,68,68,0.1)' : alert.type === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
              borderLeft: `4px solid ${alert.type === 'error' ? 'var(--danger, #ef4444)' : alert.type === 'warning' ? 'var(--accent-orange, #f59e0b)' : 'var(--accent-blue, #3b82f6)'}`,
              color: 'var(--text)', fontSize: '0.875rem', cursor: alert.link ? 'pointer' : 'default',
            }}>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI Row 1: Properties (fm/owner only) */}
      {(uxRole === 'fm' || uxRole === 'owner') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 16 }} className="kpi-grid-4">
          <KpiCard label="Nemovitosti" value={String(kpi.propertiesCount)} color="var(--accent-blue)" icon={<Building2 size={18} />} />
          <KpiCard label="Jednotky" value={String(kpi.unitsCount)} color="var(--accent-blue)" icon={<Users size={18} />} />
          <KpiCard label="Obsazenost" value={`${kpi.occupancyRate}%`} color={kpi.occupancyRate >= 80 ? 'var(--accent-green)' : 'var(--accent-orange)'} icon={<Percent size={18} />} />
          <KpiCard label="Aktivní obyvatelé" value={String(kpi.residentsCount)} color="var(--accent-green)" icon={<UserCheck size={18} />} />
        </div>
      )}

      {/* KPI Row 2: Operations & Finance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }} className="kpi-grid-4">
        <KpiCard label="Otevřené požadavky" value={String(kpi.openTickets)} color={kpi.openTickets > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'} icon={<Headphones size={18} />} />
        <KpiCard label="Urgentní požadavky" value={String(kpi.urgentTickets)} color={kpi.urgentTickets > 0 ? 'var(--accent-red, var(--danger))' : 'var(--accent-green)'} icon={<AlertTriangle size={18} />} />
        <KpiCard label="Aktivní předpisy" value={String(kpi.activePrescriptions)} color="var(--accent-blue)" icon={<FileText size={18} />} />
        <KpiCard label="Měsíční objem" value={formatKc(kpi.monthlyPrescriptionVolume ?? 0)} color="var(--accent-green)" icon={<Wallet size={18} />} />
      </div>

      {/* Quick Actions — role-aware */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24, padding: '12px 16px',
        background: 'var(--surface-2, var(--surface))', borderRadius: 8, border: '1px solid var(--border)', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: 8 }}>Rychlé akce:</span>
        <Button icon={<Headphones size={14} />} onClick={() => navigate('/helpdesk')}>Požadavky</Button>
        <Button icon={<Wrench size={14} />} onClick={() => navigate('/workorders')}>Úkoly</Button>
        <Button icon={<Search size={14} />} onClick={() => navigate('/mio/insights')}>Mio Insights</Button>
        <Button icon={<BarChart3 size={14} />} onClick={() => navigate('/reporting/operations')}>Reporting</Button>
        <Button icon={<Calendar size={14} />} onClick={() => navigate('/calendar')}>Kalendář</Button>
      </div>

      {/* ── OPERATIONAL LISTS ──────────────────────────────────── */}
      {ops && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <RecentList
            title="Otevřené požadavky"
            items={ops.recentTickets.map(t => ({
              id: t.id, label: `HD-${String(t.number).padStart(4, '0')} ${t.title}`,
              meta: t.propertyName ?? '—', priority: t.priority,
            }))}
            emptyText="Žádné otevřené požadavky"
            ctaLabel="Zobrazit vše" ctaPath="/helpdesk"
          />
          <RecentList
            title="Otevřené pracovní úkoly"
            items={ops.recentWorkOrders.map(w => ({
              id: w.id, label: w.title,
              meta: [w.propertyName, w.assetName].filter(Boolean).join(' · ') || '—',
              priority: w.priority,
            }))}
            emptyText="Žádné otevřené úkoly"
            ctaLabel="Zobrazit vše" ctaPath="/workorders"
          />
        </div>
      )}

      {/* Finance — recent transactions (fm/owner only) */}
      {(uxRole === 'fm' || uxRole === 'owner') && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Poslední transakce</h2>
            <Button size="sm" onClick={() => navigate('/finance?tab=bank')}>Zobrazit vše</Button>
          </div>
          {recentTransactions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>Žádné transakce</div>
          ) : (
            recentTransactions.map((t: any) => (
              <div key={t.id} onClick={() => navigate('/finance?tab=bank')} style={{
                padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{t.description ?? t.counterparty ?? '—'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                    {formatCzDate(t.date)}{t.variableSymbol && <span> · VS: {t.variableSymbol}</span>}
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: t.type === 'credit' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)', whiteSpace: 'nowrap' }}>
                  {t.type === 'credit' ? '+' : '-'}{formatKc(Number(t.amount))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TRUST / CONTROL BLOCK ─────────────────────────────── */}
      {(uxRole === 'fm' || uxRole === 'owner') && <TrustBlock />}
    </div>
  );
}

// ─── Mio Value Strip ─────────────────────────────────────────────

function MioValueStrip() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20,
    }} className="kpi-grid-4">
      <ValueCard
        icon={<MessageSquare size={20} />}
        title="Mio odpovídá"
        desc="Dotazy nad reálnými provozními daty"
        color="#6366f1"
        onClick={() => {}}
      />
      <ValueCard
        icon={<Search size={20} />}
        title="Mio upozorňuje"
        desc="Detekce problémů a provozních rizik"
        color="#ef4444"
        onClick={() => navigate('/mio/insights?tab=findings')}
      />
      <ValueCard
        icon={<Lightbulb size={20} />}
        title="Mio radí"
        desc="Doporučení pro efektivitu a bezpečnost"
        color="#3b82f6"
        onClick={() => navigate('/mio/insights?tab=recommendations')}
      />
    </div>
  );
}

function ValueCard({ icon, title, desc, color, onClick }: {
  icon: React.ReactNode; title: string; desc: string; color: string; onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      padding: '16px 18px', borderRadius: 10, border: '1px solid var(--border)',
      background: 'var(--surface)', cursor: 'pointer',
      display: 'flex', gap: 12, alignItems: 'center',
      transition: 'border-color 0.15s',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: color + '15', color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── Trust / Control Block ───────────────────────────────────────

function TrustBlock() {
  return (
    <div style={{
      marginTop: 24, padding: '20px 24px', borderRadius: 12,
      background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Shield size={18} style={{ color: 'var(--accent-green, #10b981)' }} />
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Bezpečnost a kontrola</div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: '0.82rem',
        color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 3, color: 'var(--accent-green, #10b981)' }} />
          <span>Přístup k datům je omezen podle role a přidělených objektů.</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 3, color: 'var(--accent-green, #10b981)' }} />
          <span>Mio průběžně vyhodnocuje provozní rizika a doporučení.</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 3, color: 'var(--accent-green, #10b981)' }} />
          <span>Každé zjištění má návaznost — od nálezu k řešení a doložení.</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 3, color: 'var(--accent-green, #10b981)' }} />
          <span>Přehledy a evidence lze exportovat pro audit a kontrolu.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Technician Dashboard ────────────────────────────────────────

function TechDashboard({ ops }: { ops: OperationalDashboard | undefined }) {
  const navigate = useNavigate();
  if (!ops) return <LoadingState text="Načítání..." />;

  const { attention } = ops;
  const totalAttention = attention.overdueTickets + attention.overdueWo + attention.highPrioTickets;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>Můj přehled</h1>

      {/* Attention */}
      {totalAttention > 0 && (
        <div style={{
          padding: 14, borderRadius: 12, marginBottom: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--danger)', marginBottom: 6 }}>
            <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Vyžaduje pozornost
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem' }}>
            {attention.overdueWo > 0 && <span>{attention.overdueWo} úkol(ů) po termínu</span>}
            {attention.overdueTickets > 0 && <span>{attention.overdueTickets} požadavek(ů) po termínu</span>}
            {attention.highPrioTickets > 0 && <span>{attention.highPrioTickets} prioritních</span>}
          </div>
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <KpiCard label="Moje otevřené úkoly" value={String(ops.workload.openWo)} color="var(--accent-blue)" icon={<Wrench size={16} />} />
        <KpiCard label="Dnes k řešení" value={String(attention.todayWoDeadlines)} color="var(--accent-orange)" icon={<Clock size={16} />} />
      </div>

      {/* Quick CTA */}
      <Button variant="primary" onClick={() => navigate('/my-agenda')}
        style={{ width: '100%', padding: '14px', fontSize: '1rem', marginBottom: 16 }}>
        <ClipboardCheck size={18} style={{ marginRight: 8 }} />
        Přejít do agendy
      </Button>

      {/* Period stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <KpiCard label="Dokončeno za 30 dní" value={String(ops.period.completedWoLast30)} color="var(--accent-green)" icon={<CheckCircle size={16} />} />
        <KpiCard label="Vyřešeno požadavků" value={String(ops.period.resolvedTicketsLast30)} color="var(--accent-green)" icon={<CheckCircle size={16} />} />
      </div>
    </div>
  );
}

// ─── Attention Section (dispatcher/FM/owner) ─────────────────────

function AttentionSection({ ops, uxRole }: { ops: OperationalDashboard; uxRole: string }) {
  const navigate = useNavigate();
  const { attention } = ops;
  const hasAttention = attention.overdueTickets + attention.overdueWo + attention.highPrioTickets + attention.todayWoDeadlines > 0;
  const hasCompliance = attention.overdueRevisions + attention.incompleteProtocols > 0;

  if (!hasAttention && !hasCompliance) return null;

  return (
    <div style={{
      marginBottom: 20, padding: 14, borderRadius: 12,
      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
        Vyžaduje pozornost
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {attention.overdueTickets > 0 && (
          <AttentionPill label={`${attention.overdueTickets} požadavek(ů) po termínu`} onClick={() => navigate('/helpdesk?overdue=true')} />
        )}
        {attention.overdueWo > 0 && (
          <AttentionPill label={`${attention.overdueWo} úkol(ů) po termínu`} onClick={() => navigate('/workorders')} />
        )}
        {attention.highPrioTickets > 0 && (
          <AttentionPill label={`${attention.highPrioTickets} prioritních požadavků`} onClick={() => navigate('/helpdesk?priority=urgent')} />
        )}
        {attention.todayWoDeadlines > 0 && (
          <AttentionPill label={`${attention.todayWoDeadlines} úkol(ů) s termínem dnes`} onClick={() => navigate('/workorders')} />
        )}
        {(uxRole === 'fm') && attention.overdueRevisions > 0 && (
          <AttentionPill label={`${attention.overdueRevisions} revize po termínu`} onClick={() => navigate('/revisions')} />
        )}
        {(uxRole === 'fm') && attention.incompleteProtocols > 0 && (
          <AttentionPill label={`${attention.incompleteProtocols} nedokončených protokolů`} onClick={() => navigate('/protocols')} />
        )}
        {attention.overdueRecurring > 0 && (
          <AttentionPill label={`${attention.overdueRecurring} opakovaných po termínu`} onClick={() => navigate('/helpdesk?requestOrigin=recurring_plan&overdue=true')} />
        )}
      </div>
    </div>
  );
}

function AttentionPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(239,68,68,0.3)',
      background: 'rgba(239,68,68,0.1)', color: 'var(--danger, #ef4444)',
      fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  );
}

// ─── Recent List ─────────────────────────────────────────────────

function RecentList({ title, items, emptyText, ctaLabel, ctaPath }: {
  title: string;
  items: { id: string; label: string; meta: string; priority: string }[];
  emptyText: string; ctaLabel: string; ctaPath: string;
}) {
  const navigate = useNavigate();
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h2>
        <Button size="sm" onClick={() => navigate(ctaPath)}>{ctaLabel}</Button>
      </div>
      {items.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>{emptyText}</div>
      ) : (
        items.map(item => (
          <div key={item.id} onClick={() => navigate(ctaPath)} style={{
            padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 500 }}>{item.label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{item.meta}</div>
            </div>
            <Badge variant={PRIO_COLOR[item.priority] ?? 'muted'}>{PRIORITY_LABELS[item.priority] ?? item.priority}</Badge>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Mio Findings Section ────────────────────────────────────────

const SEV_COLOR: Record<string, 'red' | 'yellow' | 'blue'> = { critical: 'red', warning: 'yellow', info: 'blue' };
const SEV_LABEL: Record<string, string> = { critical: 'Kritické', warning: 'Varování', info: 'Informace' };

function FindingsSection() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: findings = [] } = useQuery<MioFinding[]>({
    queryKey: ['mio', 'findings'],
    queryFn: () => dashboardApi.findings(),
    refetchInterval: 300_000,
  });
  const dismissMut = useMutation({
    mutationFn: (id: string) => dashboardApi.dismissFinding(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mio', 'findings'] }),
  });

  if (findings.length === 0) return null;

  return (
    <div style={{
      marginBottom: 20, padding: 14, borderRadius: 12,
      background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '1.1rem' }}>🔍</span> Mio upozorňuje ({findings.length})
        <a href="/mio/insights?tab=findings" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--primary, #6366f1)' }}>Zobrazit vše</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {findings.slice(0, 8).map(f => (
          <div key={f.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
          }}>
            <Badge variant={SEV_COLOR[f.severity] ?? 'blue'}>{SEV_LABEL[f.severity] ?? f.severity}</Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{f.title}</div>
              {f.description && <div className="text-muted" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {f.helpdeskTicketId ? (
                <Button size="sm" onClick={() => navigate('/helpdesk')}>Ticket</Button>
              ) : f.actionUrl ? (
                <Button size="sm" onClick={() => navigate(f.actionUrl!)}>{f.actionLabel ?? 'Otevřít'}</Button>
              ) : null}
              <Button size="sm" onClick={() => dismissMut.mutate(f.id)} disabled={dismissMut.isPending}>Skrýt</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mio Recommendations Section ─────────────────────────────────

const CAT_COLOR: Record<string, 'blue' | 'green' | 'purple' | 'yellow'> = {
  efficiency: 'blue', security: 'yellow', adoption: 'green', integration: 'purple',
};
const CAT_LABEL: Record<string, string> = {
  efficiency: 'Efektivita', security: 'Bezpečnost', adoption: 'Používání', integration: 'Integrace',
};

function RecommendationsSection() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: recs = [] } = useQuery<MioFinding[]>({
    queryKey: ['mio', 'recommendations'],
    queryFn: () => dashboardApi.recommendations(),
    refetchInterval: 300_000,
  });
  const dismissMut = useMutation({
    mutationFn: (id: string) => dashboardApi.dismissRecommendation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mio', 'recommendations'] }),
  });

  if (recs.length === 0) return null;

  return (
    <div style={{
      marginBottom: 20, padding: 14, borderRadius: 12,
      background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '1.1rem' }}>💡</span> Mio radí ({recs.length})
        <a href="/mio/insights?tab=recommendations" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--primary, #6366f1)' }}>Zobrazit vše</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recs.slice(0, 5).map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
          }}>
            <Badge variant={CAT_COLOR[(r as any).category] ?? 'blue'}>{CAT_LABEL[(r as any).category] ?? 'Tip'}</Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{r.title}</div>
              {r.description && <div className="text-muted" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {r.actionUrl && (
                <Button size="sm" onClick={() => navigate(r.actionUrl!)}>{r.actionLabel ?? 'Zjistit více'}</Button>
              )}
              <Button size="sm" onClick={() => dismissMut.mutate(r.id)} disabled={dismissMut.isPending}>Skrýt</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
