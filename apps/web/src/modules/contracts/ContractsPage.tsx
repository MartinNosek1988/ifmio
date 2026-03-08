import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { useContractsStore, type LeaseAgreement, isExpiringSoon, daysToExpiry } from './contracts-store';
import { formatKc, formatCzDate } from '../../shared/utils/format';
import { loadFromStorage } from '../../core/storage';
import LeaseDetailModal from './LeaseDetailModal';
import LeaseForm from './LeaseForm';

type R = Record<string, unknown>;

const STATUS_COLOR: Record<string, BadgeVariant> = {
  aktivni: 'green', ukoncena: 'muted', pozastavena: 'yellow', pripravovana: 'blue',
};
const STATUS_LABEL: Record<string, string> = {
  aktivni: 'Aktivni', ukoncena: 'Ukoncena', pozastavena: 'Pozastavena', pripravovana: 'Pripravovana',
};

export default function ContractsPage() {
  const { agreements, load, getStats } = useContractsStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<LeaseAgreement | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [load]);

  const properties = useMemo(() => loadFromStorage<R[]>('estateos_properties', []), []);
  const stats = getStats();

  const filtered = useMemo(() => {
    return agreements.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !search || a.najemnik.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [agreements, search, filterStatus]);

  const columns: Column<LeaseAgreement>[] = [
    { key: 'najemnik', label: 'Najemnik', render: a => <span style={{ fontWeight: 600 }}>{a.najemnik}</span> },
    { key: 'propId', label: 'Nemovitost', render: a => {
      const p = properties.find(p => String(p.id) === String(a.propId));
      return <span className="text-muted">{String(p?.nazev || p?.name || `#${a.propId}`)}</span>;
    }},
    { key: 'datumOd', label: 'Od', render: a => <span className="text-sm">{formatCzDate(a.datumOd)}</span> },
    { key: 'datumDo', label: 'Do', render: a => (
      <span className="text-sm">
        {a.datumDo ? formatCzDate(a.datumDo) : 'Neurcito'}
        {isExpiringSoon(a) && (
          <span style={{ marginLeft: 6 }}><Badge variant="yellow">{daysToExpiry(a.datumDo)}d</Badge></span>
        )}
      </span>
    )},
    { key: 'mesicniNajem', label: 'Najem/mes', align: 'right', render: a => <span className="font-semibold">{formatKc(a.mesicniNajem)}</span> },
    { key: 'status', label: 'Stav', render: a => <Badge variant={STATUS_COLOR[a.status] || 'muted'}>{STATUS_LABEL[a.status] || a.status}</Badge> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Najemni smlouvy</h1>
          <p className="page-subtitle">{stats.active} aktivnich smluv</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nova smlouva</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem smluv" value={String(stats.total)} color="var(--accent-blue)" />
        <KpiCard label="Aktivnich" value={String(stats.active)} color="var(--accent-green)" />
        <KpiCard label="Mesicni prijem" value={formatKc(stats.monthlyTotal)} color="var(--accent-purple)" />
        <KpiCard label="Blizi se konec" value={String(stats.expiringSoon)} color="var(--accent-orange)" />
      </div>

      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat najemnika..." onSearch={setSearch} />
        <select className="btn" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Vse</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Table data={filtered} columns={columns} rowKey={a => a.id} onRowClick={a => setSelected(a)} emptyText="Zadne najemni smlouvy" />

      {selected && (
        <LeaseDetailModal
          lease={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}

      {showForm && (
        <LeaseForm onClose={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
