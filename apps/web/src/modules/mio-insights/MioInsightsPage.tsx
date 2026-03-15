import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ExternalLink, X, RotateCcw } from 'lucide-react';
import { KpiCard, Badge, Button, LoadingState, EmptyState } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { apiClient } from '../../core/api/client';

interface Insight {
  id: string; tenantId: string; kind: string; code: string; title: string;
  description: string | null; category: string | null; severity: string;
  confidence: string; status: string; entityType: string | null;
  entityId: string | null; fingerprint: string; actionLabel: string | null;
  actionUrl: string | null; helpdeskTicketId: string | null;
  ticketCreatedAutomatically: boolean;
  firstDetectedAt: string; lastDetectedAt: string;
  dismissedAt: string | null; snoozedUntil: string | null;
}

interface Summary {
  activeFindings: number; criticalFindings: number;
  activeRecs: number; snoozed: number; resolvedLast30: number;
}

const SEV_COLOR: Record<string, BadgeVariant> = { critical: 'red', warning: 'yellow', info: 'blue' };
const SEV_LABEL: Record<string, string> = { critical: 'Kritické', warning: 'Varování', info: 'Informace' };
const CAT_COLOR: Record<string, BadgeVariant> = { efficiency: 'blue', security: 'yellow', adoption: 'green', integration: 'purple', data_quality: 'muted' };
const CAT_LABEL: Record<string, string> = { efficiency: 'Efektivita', security: 'Bezpečnost', adoption: 'Používání', integration: 'Integrace', data_quality: 'Kvalita dat' };
const STATUS_LABEL: Record<string, string> = { active: 'Aktivní', dismissed: 'Skryto', snoozed: 'Odloženo', resolved: 'Vyřešeno' };

const EXPLAIN: Record<string, string> = {
  overdue_recurring_request: 'Vidíte to, protože opakovaný požadavek překročil plánovaný termín.',
  overdue_revision: 'Vidíte to, protože revize je po termínu a vyžaduje pozornost.',
  overdue_work_order: 'Vidíte to, protože pracovní úkol překročil plánovaný termín.',
  urgent_ticket_no_assignee: 'Vidíte to, protože urgentní požadavek nemá přiřazeného řešitele.',
  asset_no_recurring_plan: 'Vidíte to, protože zařízení nemá nastavenou opakovanou činnost.',
  recurring_plans_adoption: 'Vidíte to, protože máte více zařízení a jen minimum opakovaných plánů.',
  reporting_export_tip: 'Vidíte to, protože máte dostatečný objem dat pro využití exportů a reportů.',
  helpdesk_filtering_tip: 'Vidíte to, protože při větším počtu požadavků doporučujeme využít filtry.',
  attachments_protocol_tip: 'Vidíte to, protože dokončené úkoly nemají přiložené protokoly.',
  security_access_tip: 'Vidíte to, protože s více uživateli doporučujeme zkontrolovat přístupy.',
};

const EMPTY_MESSAGES: Record<string, string> = {
  active: 'Aktuálně nevidím žádná aktivní zjištění.',
  dismissed: 'Nemáte žádné skryté položky.',
  snoozed: 'Nemáte žádné odložené položky.',
  resolved: 'Za posledních 30 dní nebyly vyřešeny žádné položky.',
  '': 'Ve vybraném filtru nejsou žádné záznamy.',
};

export default function MioInsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Init from URL
  const [kindFilter, setKindFilter] = useState(
    searchParams.get('tab') === 'recommendations' ? 'recommendation'
    : searchParams.get('tab') === 'findings' ? 'finding'
    : searchParams.get('kind') ?? ''
  );
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [sevFilter, setSevFilter] = useState(searchParams.get('severity') ?? '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  // Sync filters → URL
  useEffect(() => {
    const p: Record<string, string> = {};
    if (kindFilter) p.kind = kindFilter;
    if (statusFilter) p.status = statusFilter;
    if (sevFilter) p.severity = sevFilter;
    if (search) p.search = search;
    setSearchParams(p, { replace: true });
  }, [kindFilter, statusFilter, sevFilter, search, setSearchParams]);

  const params: Record<string, string> = {};
  if (kindFilter) params.kind = kindFilter;
  if (statusFilter) params.status = statusFilter;
  if (sevFilter) params.severity = sevFilter;
  if (search) params.search = search;

  const { data: insights = [], isLoading } = useQuery<Insight[]>({
    queryKey: ['mio', 'insights', params],
    queryFn: () => apiClient.get('/mio/insights', { params }).then(r => r.data),
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ['mio', 'insights', 'summary'],
    queryFn: () => apiClient.get('/mio/insights/summary').then(r => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mio', 'insights'] });
    qc.invalidateQueries({ queryKey: ['mio', 'findings'] });
    qc.invalidateQueries({ queryKey: ['mio', 'recommendations'] });
  };

  const dismissMut = useMutation({
    mutationFn: (id: string) => apiClient.post(`/mio/insights/${id}/dismiss`),
    onSuccess: invalidate,
  });
  const restoreMut = useMutation({
    mutationFn: (id: string) => apiClient.post(`/mio/insights/${id}/restore`),
    onSuccess: invalidate,
  });

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem',
  };

  if (isLoading) return <LoadingState text="Načítání Mio Insights..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mio Insights</h1>
          <p className="page-subtitle">Přehled zjištění a doporučení</p>
        </div>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }} className="kpi-grid-4">
          <KpiCard label="Aktivní upozornění" value={String(summary.activeFindings)} color="var(--danger)" />
          <KpiCard label="Kritická" value={String(summary.criticalFindings)} color="var(--accent-red, var(--danger))" />
          <KpiCard label="Doporučení" value={String(summary.activeRecs)} color="var(--accent-blue)" />
          <KpiCard label="Odložené" value={String(summary.snoozed)} color="var(--accent-orange)" />
          <KpiCard label="Vyřešeno (30d)" value={String(summary.resolvedLast30)} color="var(--accent-green)" />
        </div>
      )}

      {/* Quick status chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['', 'active', 'snoozed', 'dismissed', 'resolved'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
            border: statusFilter === s ? '2px solid var(--primary, #6366f1)' : '1px solid var(--border)',
            background: statusFilter === s ? 'var(--primary, #6366f1)' : 'var(--surface)',
            color: statusFilter === s ? '#fff' : 'var(--text)', cursor: 'pointer',
          }}>
            {s ? STATUS_LABEL[s] ?? s : 'Vše'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} style={inputStyle}>
          <option value="">Všechny typy</option>
          <option value="finding">Upozornění</option>
          <option value="recommendation">Doporučení</option>
        </select>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} style={inputStyle}>
          <option value="">Všechny závažnosti</option>
          <option value="critical">Kritické</option>
          <option value="warning">Varování</option>
          <option value="info">Informace</option>
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat..." style={{ ...inputStyle, width: 200 }} />
      </div>

      {/* Items list */}
      {insights.length === 0 ? (
        <EmptyState title="Žádné záznamy" description={EMPTY_MESSAGES[statusFilter] ?? EMPTY_MESSAGES['']} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.map(item => (
            <InsightCard
              key={item.id}
              item={item}
              onDismiss={() => dismissMut.mutate(item.id)}
              onRestore={() => restoreMut.mutate(item.id)}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ item, onDismiss, onRestore, navigate }: {
  item: Insight; onDismiss: () => void; onRestore: () => void; navigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFinding = item.kind === 'finding';
  const isNonActive = item.status === 'dismissed' || item.status === 'snoozed';
  const explain = EXPLAIN[item.code] ?? `Toto zjištění pochází z automatické kontroly (kód: ${item.code}).`;

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)',
      background: 'var(--surface)', opacity: isNonActive ? 0.7 : 1,
      borderLeft: `4px solid ${isFinding ? (item.severity === 'critical' ? '#ef4444' : item.severity === 'warning' ? '#f59e0b' : '#3b82f6') : '#8b5cf6'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <Badge variant={isFinding ? 'red' : 'purple'}>{isFinding ? 'Upozornění' : 'Doporučení'}</Badge>
            {isFinding && <Badge variant={SEV_COLOR[item.severity] ?? 'muted'}>{SEV_LABEL[item.severity] ?? item.severity}</Badge>}
            {!isFinding && item.category && <Badge variant={CAT_COLOR[item.category] ?? 'muted'}>{CAT_LABEL[item.category] ?? item.category}</Badge>}
            {item.status !== 'active' && <Badge variant="muted">{STATUS_LABEL[item.status] ?? item.status}</Badge>}
            {item.helpdeskTicketId && <Badge variant="green">Má ticket</Badge>}
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</div>
          {item.description && <div className="text-muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>{item.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {item.helpdeskTicketId && (
            <Button size="sm" onClick={() => navigate('/helpdesk')}><ExternalLink size={12} style={{ marginRight: 3 }} />Ticket</Button>
          )}
          {item.actionUrl && !item.helpdeskTicketId && (
            <Button size="sm" onClick={() => navigate(item.actionUrl!)}>{item.actionLabel ?? 'Otevřít'}</Button>
          )}
          {item.status === 'active' && (
            <Button size="sm" onClick={onDismiss}><X size={12} /></Button>
          )}
          {isNonActive && (
            <Button size="sm" onClick={onRestore}><RotateCcw size={12} style={{ marginRight: 3 }} />Obnovit</Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
          Zjištěno: {new Date(item.lastDetectedAt).toLocaleDateString('cs-CZ')}
          {item.snoozedUntil && item.status === 'snoozed' && (
            <span> · Odloženo do: {new Date(item.snoozedUntil).toLocaleDateString('cs-CZ')}</span>
          )}
          {item.dismissedAt && item.status === 'dismissed' && (
            <span> · Skryto: {new Date(item.dismissedAt).toLocaleDateString('cs-CZ')}</span>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
          fontSize: '0.78rem', padding: '2px 4px',
        }}>
          {expanded ? 'Skrýt detail' : 'Proč to vidím'}
        </button>
      </div>

      {expanded && (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 6,
          background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)',
          fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5,
        }}>
          {explain}
          {item.entityType && <div style={{ marginTop: 4 }}>Souvisí s: <strong>{item.entityType}</strong></div>}
        </div>
      )}
    </div>
  );
}
