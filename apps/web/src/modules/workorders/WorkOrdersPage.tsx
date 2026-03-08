import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS, label } from '../../constants/labels';
import { SlaProgressBar } from './SlaProgressBar';
import { useWorkOrderStore, type WorkOrder } from './workorder-store';
import WorkOrderDetailModal from './WorkOrderDetailModal';
import WorkOrderForm from './WorkOrderForm';

const PRIO_COLOR: Record<string, BadgeVariant> = { kriticka: 'red', vysoka: 'yellow', normalni: 'blue', nizka: 'muted' };
const STATUS_COLOR: Record<string, BadgeVariant> = { nova: 'blue', v_reseni: 'yellow', vyresena: 'green', uzavrena: 'muted', zrusena: 'red' };

export default function WorkOrdersPage() {
  const { workOrders, load, getStats } = useWorkOrderStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [load]);

  const stats = getStats();

  const filtered = useMemo(() => {
    let list = workOrders;
    if (filterStatus !== 'all') list = list.filter(w => w.stav === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(w => w.nazev.toLowerCase().includes(q) || (w.popis || '').toLowerCase().includes(q) || (w.resitel || '').toLowerCase().includes(q));
    }
    return list;
  }, [workOrders, search, filterStatus]);

  const columns: Column<WorkOrder>[] = [
    { key: 'nazev', label: 'Nazev', render: w => <span style={{ fontWeight: 600 }}>{w.nazev}</span> },
    { key: 'priorita', label: 'Priorita', render: w => <Badge variant={PRIO_COLOR[w.priorita] || 'muted'}>{label(WO_PRIORITY_LABELS, w.priorita)}</Badge> },
    { key: 'stav', label: 'Stav', render: w => <Badge variant={STATUS_COLOR[w.stav] || 'muted'}>{label(WO_STATUS_LABELS, w.stav)}</Badge> },
    { key: 'resitel', label: 'Resitel', render: w => <span className="text-muted">{w.resitel || 'Neprirazeno'}</span> },
    { key: 'sla', label: 'SLA', render: w => <SlaProgressBar created={w.datumVytvoreni} deadline={w.terminDo || ''} status={w.stav} /> },
    { key: 'datumVytvoreni', label: 'Vytvoreno', render: w => <span className="text-muted text-sm">{formatCzDate(w.datumVytvoreni)}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Orders</h1>
          <p className="page-subtitle">{stats.otevrene} otevrenych z {stats.celkem}</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Novy Work Order</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats.celkem)} color="var(--accent-blue)" />
        <KpiCard label="Otevrenych" value={String(stats.otevrene)} color="var(--accent-orange)" />
        <KpiCard label="Kritickych" value={String(stats.kriticke)} color="var(--accent-red)" />
        <KpiCard label="Po terminu" value={String(stats.poTerminu)} color="var(--danger)" />
      </div>

      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat work orders..." onSearch={setSearch} />
        <select className="btn" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Vse</option>
          {Object.entries(WO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Zadne work orders" description="Vytvorte novy work order." />
      ) : (
        <Table data={filtered} columns={columns} rowKey={w => w.id} onRowClick={w => setSelectedWO(w)} />
      )}

      {selectedWO && (
        <WorkOrderDetailModal
          workOrder={selectedWO}
          onClose={() => setSelectedWO(null)}
          onUpdated={() => { load(); setSelectedWO(null); }}
        />
      )}

      {showForm && (
        <WorkOrderForm onClose={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
