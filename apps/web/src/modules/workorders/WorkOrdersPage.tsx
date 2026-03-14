import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import type { Column, BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS, label } from '../../constants/labels';
import { SlaProgressBar } from './SlaProgressBar';
import { useWorkOrders, useWOStats, useDeleteWorkOrder } from './api/workorders.queries';
import type { ApiWorkOrder } from './api/workorders.api';
import WorkOrderDetailModal from './WorkOrderDetailModal';
import WorkOrderForm from './WorkOrderForm';

const PRIO_COLOR: Record<string, BadgeVariant> = { kriticka: 'red', vysoka: 'yellow', normalni: 'blue', nizka: 'muted' };
const STATUS_COLOR: Record<string, BadgeVariant> = { nova: 'blue', v_reseni: 'yellow', vyresena: 'green', uzavrena: 'muted', zrusena: 'red' };

export default function WorkOrdersPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedWO, setSelectedWO] = useState<ApiWorkOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiWorkOrder | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (filterStatus !== 'all') p.status = filterStatus;
    if (search) p.search = search;
    return p;
  }, [filterStatus, search]);

  const { data: workOrders, isLoading, isError, refetch } = useWorkOrders(params);
  const { data: stats } = useWOStats();
  const deleteMutation = useDeleteWorkOrder();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); if (selectedWO?.id === deleteTarget.id) setSelectedWO(null); },
    });
  };

  if (isLoading) return <LoadingState text="Nacitani work orders..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const items = workOrders ?? [];

  const columns: Column<ApiWorkOrder>[] = [
    { key: 'title', label: 'Nazev', render: w => <span style={{ fontWeight: 600 }}>{w.title}</span> },
    { key: 'priority', label: 'Priorita', render: w => <Badge variant={PRIO_COLOR[w.priority] || 'muted'}>{label(WO_PRIORITY_LABELS, w.priority)}</Badge> },
    { key: 'status', label: 'Stav', render: w => <Badge variant={STATUS_COLOR[w.status] || 'muted'}>{label(WO_STATUS_LABELS, w.status)}</Badge> },
    { key: 'assignee', label: 'Řešitel', render: w => <span className="text-muted">{w.assigneeUser?.name || w.assignee || '—'}</span> },
    { key: 'asset', label: 'Zařízení', render: w => <span className="text-muted">{w.asset?.name || '—'}</span> },
    { key: 'sla', label: 'SLA', render: w => <SlaProgressBar created={w.createdAt} deadline={w.deadline || ''} status={w.status} /> },
    { key: 'createdAt', label: 'Vytvoreno', render: w => <span className="text-muted text-sm">{formatCzDate(w.createdAt)}</span> },
    {
      key: 'actions', label: '', align: 'right',
      render: (w) => (
        <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteTarget(w); }}
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
          <h1 className="page-title">Pracovní úkoly</h1>
          <p className="page-subtitle">{stats?.open ?? 0} otevřených z {stats?.total ?? 0}</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nový úkol</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats?.total ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Otevrenych" value={String(stats?.open ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="Dokoncenych dnes" value={String(stats?.completedToday ?? 0)} color="var(--accent-green)" />
        <KpiCard label="Po terminu" value={String(stats?.overdue ?? 0)} color="var(--danger)" />
      </div>

      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat work orders..." onSearch={setSearch} />
        <select className="btn" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Vse</option>
          {Object.entries(WO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Zadne work orders" description="Vytvorte novy work order." />
      ) : (
        <Table data={items} columns={columns} rowKey={w => w.id} onRowClick={w => setSelectedWO(w)} />
      )}

      {selectedWO && (
        <WorkOrderDetailModal
          workOrder={selectedWO}
          onClose={() => setSelectedWO(null)}
          onUpdated={() => setSelectedWO(null)}
        />
      )}

      {showForm && (
        <WorkOrderForm onClose={() => setShowForm(false)} />
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
            <h3 style={{ marginBottom: 8 }}>Smazat work order?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
              Opravdu chcete smazat work order <strong>{deleteTarget.title}</strong>? Tuto akci nelze vratit.
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
