import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Settings, Mail } from 'lucide-react';
import { KpiCard, Table, Badge, Button, LoadingState, ErrorState, EmptyState } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { operationsReportsApi } from './api/operations-reports.api';
import type { OperationalReportRow, AssetReportRow, ProtocolReportRow, ReportSubscription } from './api/operations-reports.api';
import { useProperties } from '../properties/use-properties';
import type { ApiProperty } from '../properties/properties-api';

type TabKey = 'operations' | 'assets' | 'protocols';

const STATUS_COLOR: Record<string, BadgeVariant> = {
  open: 'blue', in_progress: 'yellow', resolved: 'green', closed: 'muted',
  nova: 'blue', v_reseni: 'yellow', vyresena: 'green', uzavrena: 'muted', zrusena: 'red',
  draft: 'blue', completed: 'green', confirmed: 'purple',
};

const PRIO_COLOR: Record<string, BadgeVariant> = {
  low: 'muted', medium: 'blue', high: 'yellow', urgent: 'red',
  nizka: 'muted', normalni: 'blue', vysoka: 'yellow', kriticka: 'red',
};

const now = new Date();
const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
const defaultTo = now.toISOString().slice(0, 10);

export default function OperationalReportsPage() {
  const [tab, setTab] = useState<TabKey>('operations');
  const [filters, setFilters] = useState({ propertyId: '', dateFrom: defaultFrom, dateTo: defaultTo });
  const [showSubs, setShowSubs] = useState(false);
  const { data: properties = [] } = useProperties();

  const set = (key: string, value: string) => setFilters(f => ({ ...f, [key]: value }));
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)',
  };

  const exportUrl = (type: 'operations' | 'assets' | 'protocols') =>
    operationsReportsApi.exportUrl(type, activeFilters);

  const tabItems: { key: TabKey; label: string }[] = [
    { key: 'operations', label: 'Provozní report' },
    { key: 'assets', label: 'Technický report zařízení' },
    { key: 'protocols', label: 'Registr protokolů' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporting</h1>
          <p className="page-subtitle">Provozní přehledy a exporty</p>
        </div>
        <Button icon={<Mail size={15} />} onClick={() => setShowSubs(!showSubs)}>
          {showSubs ? 'Skrýt nastavení' : 'Plánované reporty'}
        </Button>
      </div>

      {showSubs && <SubscriptionSettings />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label className="form-label">Období od</label>
          <input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="form-label">Období do</label>
          <input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="form-label">Objekt</label>
          <select value={filters.propertyId} onChange={e => set('propertyId', e.target.value)} style={inputStyle}>
            <option value="">Všechny</option>
            {(properties as ApiProperty[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <a href={exportUrl(tab)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Button icon={<Download size={14} />}>Export XLSX</Button>
        </a>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {tabItems.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'operations' && <OperationsTab filters={activeFilters} />}
      {tab === 'assets' && <AssetsTab filters={activeFilters} />}
      {tab === 'protocols' && <ProtocolsTab filters={activeFilters} />}
    </div>
  );
}

// ─── Operations Tab ──────────────────────────────────────────────

function OperationsTab({ filters }: { filters: Record<string, string> }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'operations', filters],
    queryFn: () => operationsReportsApi.operations(filters),
  });

  if (isLoading) return <LoadingState text="Načítání provozního reportu..." />;
  if (error) return <ErrorState message="Nepodařilo se načíst report." />;
  if (!data) return <EmptyState title="Vyberte filtry" description="Vyberte filtry a spusťte report." />;

  const { kpi } = data;
  const allRows: OperationalReportRow[] = [...data.tickets, ...data.workOrders];

  const columns: Column<OperationalReportRow>[] = [
    { key: 'type', label: 'Typ', render: r => <Badge variant={r.type === 'request' ? 'blue' : 'purple'}>{r.type === 'request' ? 'Požadavek' : 'Úkol'}</Badge> },
    { key: 'title', label: 'Název', render: r => <span style={{ fontWeight: 500 }}>{r.title}</span> },
    { key: 'property', label: 'Objekt', render: r => <span className="text-muted">{r.property ?? '—'}</span> },
    { key: 'asset', label: 'Zařízení', render: r => <span className="text-muted">{r.asset ?? '—'}</span> },
    { key: 'resolver', label: 'Řešitel', render: r => <span className="text-muted">{r.resolver ?? '—'}</span> },
    { key: 'priority', label: 'Priorita', render: r => <Badge variant={PRIO_COLOR[r.priority] ?? 'muted'}>{r.priority}</Badge> },
    { key: 'status', label: 'Stav', render: r => <Badge variant={STATUS_COLOR[r.status] ?? 'muted'}>{r.status}</Badge> },
    { key: 'createdAt', label: 'Vytvořeno', render: r => <span className="text-muted text-sm">{new Date(r.createdAt).toLocaleDateString('cs-CZ')}</span> },
    { key: 'completedAt', label: 'Dokončeno', render: r => <span className="text-muted text-sm">{r.completedAt ? new Date(r.completedAt).toLocaleDateString('cs-CZ') : '—'}</span> },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Požadavky celkem" value={String(kpi.totalTickets)} color="var(--accent-blue)" />
        <KpiCard label="Otevřené požadavky" value={String(kpi.openTickets)} color="var(--accent-orange)" />
        <KpiCard label="Po termínu" value={String(kpi.overdueTickets)} color="var(--danger)" />
        <KpiCard label="Prům. vyřešení (hod)" value={kpi.avgResolveHours != null ? String(kpi.avgResolveHours) : '—'} color="var(--accent-green)" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Úkoly celkem" value={String(kpi.totalWo)} color="var(--accent-blue)" />
        <KpiCard label="Otevřené úkoly" value={String(kpi.openWo)} color="var(--accent-orange)" />
        <KpiCard label="Dokončené úkoly" value={String(kpi.completedWo)} color="var(--accent-green)" />
        <KpiCard label="Prům. dokončení (hod)" value={kpi.avgCompleteHours != null ? String(kpi.avgCompleteHours) : '—'} color="var(--accent-green)" />
      </div>

      {/* Top tables */}
      {data.topAssets.length > 0 && (
        <div style={{ marginBottom: 20, padding: 14, borderRadius: 8, background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>Nejproblematičtější zařízení</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.topAssets.map(a => (
              <Badge key={a.id} variant="red">{a.name} ({a.count})</Badge>
            ))}
          </div>
        </div>
      )}

      {allRows.length === 0 ? (
        <EmptyState title="Žádná data" description="Pro zadané filtry nejsou k dispozici žádná data." />
      ) : (
        <Table data={allRows} columns={columns} rowKey={r => r.id} />
      )}
    </div>
  );
}

// ─── Assets Tab ──────────────────────────────────────────────────

function AssetsTab({ filters }: { filters: Record<string, string> }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'assets', filters],
    queryFn: () => operationsReportsApi.assets(filters),
  });

  if (isLoading) return <LoadingState text="Načítání technického reportu..." />;
  if (error) return <ErrorState message="Nepodařilo se načíst report." />;
  if (!data) return <EmptyState title="Vyberte filtry" description="Vyberte filtry a spusťte report." />;

  const { kpi } = data;

  const columns: Column<AssetReportRow>[] = [
    { key: 'name', label: 'Zařízení', render: r => <span style={{ fontWeight: 500 }}>{r.name}</span> },
    { key: 'property', label: 'Objekt', render: r => <span className="text-muted">{r.property ?? '—'}</span> },
    { key: 'assetType', label: 'Typ', render: r => <span className="text-muted">{r.assetType ?? '—'}</span> },
    { key: 'requestCount', label: 'Požadavky', render: r => <span style={{ fontFamily: 'monospace' }}>{r.requestCount}</span> },
    { key: 'workOrderCount', label: 'Úkoly', render: r => <span style={{ fontFamily: 'monospace' }}>{r.workOrderCount}</span> },
    { key: 'protocolCount', label: 'Protokoly', render: r => <span style={{ fontFamily: 'monospace' }}>{r.protocolCount}</span> },
    { key: 'openWorkOrders', label: 'Otevřené', render: r => r.openWorkOrders > 0 ? <Badge variant="yellow">{r.openWorkOrders}</Badge> : <span className="text-muted">0</span> },
    { key: 'overdueWorkOrders', label: 'Po termínu', render: r => r.overdueWorkOrders > 0 ? <Badge variant="red">{r.overdueWorkOrders}</Badge> : <span className="text-muted">0</span> },
    { key: 'totalInterventions', label: 'Celkem zásahů', render: r => <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.totalInterventions}</span> },
    { key: 'lastActivity', label: 'Poslední aktivita', render: r => <span className="text-muted text-sm">{r.lastActivity ? new Date(r.lastActivity).toLocaleDateString('cs-CZ') : '—'}</span> },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Zařízení celkem" value={String(kpi.totalAssets)} color="var(--accent-blue)" />
        <KpiCard label="Se zásahy" value={String(kpi.assetsWithIssues)} color="var(--accent-orange)" />
        <KpiCard label="Otevřené úkoly" value={String(kpi.totalOpenWo)} color="var(--accent-yellow, #e6a817)" />
        <KpiCard label="Po termínu" value={String(kpi.totalOverdueWo)} color="var(--danger)" />
      </div>

      {data.rows.length === 0 ? (
        <EmptyState title="Žádná zařízení" description="V tomto období nebyly nalezeny žádné záznamy." />
      ) : (
        <Table data={data.rows} columns={columns} rowKey={r => r.id} />
      )}
    </div>
  );
}

// ─── Protocols Tab ───────────────────────────────────────────────

function ProtocolsTab({ filters }: { filters: Record<string, string> }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'protocols', filters],
    queryFn: () => operationsReportsApi.protocols(filters),
  });

  if (isLoading) return <LoadingState text="Načítání registru protokolů..." />;
  if (error) return <ErrorState message="Nepodařilo se načíst report." />;
  if (!data) return <EmptyState title="Vyberte filtry" description="Vyberte filtry a spusťte report." />;

  const { kpi } = data;

  const columns: Column<ProtocolReportRow>[] = [
    { key: 'number', label: 'Číslo', render: r => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{r.number}</span> },
    { key: 'title', label: 'Název', render: r => <span>{r.title ?? '—'}</span> },
    { key: 'protocolType', label: 'Typ', render: r => <Badge variant="blue">{r.protocolType}</Badge> },
    { key: 'status', label: 'Stav', render: r => <Badge variant={STATUS_COLOR[r.status] ?? 'muted'}>{r.status}</Badge> },
    { key: 'property', label: 'Objekt', render: r => <span className="text-muted">{r.property ?? '—'}</span> },
    { key: 'resolverName', label: 'Řešitel', render: r => <span className="text-muted">{r.resolverName ?? '—'}</span> },
    { key: 'hasGeneratedPdf', label: 'PDF', render: r => r.hasGeneratedPdf ? <Badge variant="green">Ano</Badge> : <Badge variant="muted">Ne</Badge> },
    { key: 'createdAt', label: 'Vytvořeno', render: r => <span className="text-muted text-sm">{new Date(r.createdAt).toLocaleDateString('cs-CZ')}</span> },
    { key: 'completedAt', label: 'Dokončeno', render: r => <span className="text-muted text-sm">{r.completedAt ? new Date(r.completedAt).toLocaleDateString('cs-CZ') : '—'}</span> },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Protokoly celkem" value={String(kpi.total)} color="var(--accent-blue)" />
        <KpiCard label="Dokončené" value={String(kpi.completed)} color="var(--accent-green)" />
        <KpiCard label="Potvrzené" value={String(kpi.confirmed)} color="var(--accent-purple, #8b5cf6)" />
        <KpiCard label="Bez PDF" value={String(kpi.withoutPdf)} color="var(--accent-orange)" />
      </div>

      {data.rows.length === 0 ? (
        <EmptyState title="Žádné protokoly" description="V tomto období nebyly nalezeny žádné záznamy." />
      ) : (
        <Table data={data.rows} columns={columns} rowKey={r => r.id} />
      )}
    </div>
  );
}

// ─── Subscription Settings ───────────────────────────────────

const REPORT_TYPES = [
  { value: 'daily_digest', label: 'Denní přehled' },
  { value: 'operations', label: 'Provozní report' },
  { value: 'assets', label: 'Technický report zařízení' },
  { value: 'protocols', label: 'Registr protokolů' },
] as const;

const FREQUENCIES = [
  { value: 'daily', label: 'Denně' },
  { value: 'weekly', label: 'Týdně' },
  { value: 'monthly', label: 'Měsíčně' },
] as const;

const FORMATS = [
  { value: 'xlsx', label: 'XLSX' },
  { value: 'csv', label: 'CSV' },
] as const;

function SubscriptionSettings() {
  const qc = useQueryClient();
  const { data: subs = [], isLoading } = useQuery<ReportSubscription[]>({
    queryKey: ['reports', 'subscriptions'],
    queryFn: () => operationsReportsApi.subscriptions.list(),
  });

  const upsertMutation = useMutation({
    mutationFn: (dto: { reportType: string; frequency?: string; format?: string; isEnabled?: boolean }) =>
      operationsReportsApi.subscriptions.upsert(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'subscriptions'] }),
  });

  const getSubForType = (type: string) => subs.find(s => s.reportType === type);

  const handleToggle = (type: string) => {
    const existing = getSubForType(type);
    upsertMutation.mutate({ reportType: type, isEnabled: existing ? !existing.isEnabled : true });
  };

  const handleChange = (type: string, field: string, value: string) => {
    upsertMutation.mutate({ reportType: type, [field]: value });
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem',
  };

  if (isLoading) return <LoadingState text="Načítání nastavení..." />;

  return (
    <div style={{
      marginBottom: 20, padding: 16, borderRadius: 8,
      background: 'var(--surface-2, var(--surface))', border: '1px solid var(--border)',
    }}>
      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Settings size={16} /> Automatické zasílání reportů
      </div>
      <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 14 }}>
        Řešitel dostává pouze své přiřazené položky. Dispečer a admin dostávají přehled v rámci přidělených objektů.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REPORT_TYPES.map(rt => {
          const sub = getSubForType(rt.value);
          const isEnabled = sub?.isEnabled ?? false;
          const isDigest = rt.value === 'daily_digest';
          return (
            <div key={rt.value} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
            }}>
              <div style={{ flex: 1, fontWeight: 500 }}>{rt.label}</div>
              {!isDigest && (
                <>
                  <select value={sub?.frequency ?? 'daily'} onChange={e => handleChange(rt.value, 'frequency', e.target.value)} style={inputStyle} disabled={!isEnabled}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <select value={sub?.format ?? 'xlsx'} onChange={e => handleChange(rt.value, 'format', e.target.value)} style={inputStyle} disabled={!isEnabled}>
                    {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </>
              )}
              <Button size="sm" variant={isEnabled ? 'primary' : undefined} onClick={() => handleToggle(rt.value)} disabled={upsertMutation.isPending}>
                {isEnabled ? 'Zapnuto' : 'Vypnuto'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
