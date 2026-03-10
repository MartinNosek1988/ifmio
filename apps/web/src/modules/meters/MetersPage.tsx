import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import type { Column, BadgeVariant } from '../../shared/components';
import { METER_TYPE_LABELS, label } from '../../constants/labels';
import { useMeters, useMeterStats, useDeleteMeter } from './api/meters.queries';
import type { ApiMeter } from './api/meters.api';
import MeterDetailModal from './MeterDetailModal';
import MeterForm from './MeterForm';

const TYP_COLOR: Record<string, BadgeVariant> = {
  elektrina: 'yellow', voda_studena: 'blue', voda_tepla: 'red',
  plyn: 'blue', teplo: 'red',
};

function calibrationStatus(due: string | null): { label: string; variant: BadgeVariant } | null {
  if (!due) return null;
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `Proš. ${Math.abs(days)}d`, variant: 'red' };
  if (days <= 90) return { label: `Kal. za ${days}d`, variant: 'yellow' };
  return null;
}

export default function MetersPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState<ApiMeter | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiMeter | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (filterType !== 'all') p.meterType = filterType;
    if (search) p.search = search;
    return p;
  }, [filterType, search]);

  const { data: meters, isLoading, isError, refetch } = useMeters(params);
  const { data: stats } = useMeterStats();
  const deleteMutation = useDeleteMeter();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); if (selected?.id === deleteTarget.id) setSelected(null); },
    });
  };

  if (isLoading) return <LoadingState text="Nacitani meridel..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const items = meters ?? [];

  const columns: Column<ApiMeter>[] = [
    { key: 'name', label: 'Nazev', render: m => <span style={{ fontWeight: 600 }}>{m.name}</span> },
    { key: 'serialNumber', label: 'Cislo', render: m => <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{m.serialNumber}</span> },
    { key: 'meterType', label: 'Typ', render: m => <Badge variant={TYP_COLOR[m.meterType] || 'muted'}>{label(METER_TYPE_LABELS, m.meterType)}</Badge> },
    { key: 'property', label: 'Nemovitost', render: m => <span className="text-muted">{m.property?.name || '—'}</span> },
    { key: 'lastReading', label: 'Posledni odecet', align: 'right', render: m => (
      <span className="font-semibold">{m.lastReading != null ? `${m.lastReading.toLocaleString('cs-CZ')} ${m.unit}` : '—'}</span>
    )},
    { key: 'calibration', label: 'Kalibrace', render: m => {
      const cal = calibrationStatus(m.calibrationDue);
      return cal ? <Badge variant={cal.variant}>{cal.label}</Badge> : <span className="text-muted text-sm">OK</span>;
    }},
    {
      key: 'actions', label: '', align: 'right',
      render: (m) => (
        <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteTarget(m); }}
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '3px 8px', fontSize: '0.75rem' }}>
          Smazat
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meridla & Energie</h1>
          <p className="page-subtitle">{stats?.total ?? 0} meridel</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nove meridlo</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats?.total ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Elektrina" value={String(stats?.elektrina ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="Voda" value={String((stats?.vodaStudena ?? 0) + (stats?.vodaTepla ?? 0))} color="var(--accent-blue)" />
        <KpiCard label="Prosl. kalibrace" value={String(stats?.calibrationDue ?? 0)} color="var(--danger)" />
      </div>

      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat meridla..." onSearch={setSearch} />
        <select className="btn" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Vse</option>
          {Object.entries(METER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Zadna meridla" description="Pridejte prvni meridlo." />
      ) : (
        <Table data={items} columns={columns} rowKey={m => m.id} onRowClick={m => setSelected(m)} />
      )}

      {selected && (
        <MeterDetailModal
          meter={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => setSelected(null)}
        />
      )}

      {showForm && (
        <MeterForm onClose={() => setShowForm(false)} />
      )}

      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }} onClick={() => setDeleteTarget(null)}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, maxWidth: 420, width: '90%',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>Smazat meridlo?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
              Opravdu chcete smazat meridlo <strong>{deleteTarget.name}</strong> ({deleteTarget.serialNumber})? Vsechny odpocty budou take smazany.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteTarget(null)}>Zrusit</Button>
              <Button variant="primary" onClick={handleDelete}
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
                Smazat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
