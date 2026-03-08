import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { METER_TYPE_LABELS, label } from '../../constants/labels';
import { useMeterStore, type Meter } from './meter-store';
import MeterDetailModal from './MeterDetailModal';
import MeterForm from './MeterForm';

const TYP_COLOR: Record<string, BadgeVariant> = {
  elektrina: 'yellow', voda_studena: 'blue', voda_tepla: 'red',
  plyn: 'blue', teplo: 'red',
};

export default function MetersPage() {
  const { meters, load, getStats } = useMeterStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Meter | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [load]);

  const stats = getStats();

  const filtered = useMemo(() => {
    if (!search) return meters;
    const q = search.toLowerCase();
    return meters.filter(m => m.nazev.toLowerCase().includes(q) || m.cislo.toLowerCase().includes(q));
  }, [meters, search]);

  const columns: Column<Meter>[] = [
    { key: 'nazev', label: 'Nazev', render: m => <span style={{ fontWeight: 600 }}>{m.nazev}</span> },
    { key: 'cislo', label: 'Cislo', render: m => <span className="text-muted">{m.cislo}</span> },
    { key: 'typ', label: 'Typ', render: m => <Badge variant={TYP_COLOR[m.typ] || 'muted'}>{label(METER_TYPE_LABELS, m.typ)}</Badge> },
    { key: 'jednotka', label: 'Jednotka', render: m => m.jednotka },
    { key: 'posledniOdecet', label: 'Posledni odecet', align: 'right', render: m => <span className="font-semibold">{m.posledniOdecet != null ? m.posledniOdecet.toLocaleString('cs-CZ') : '—'}</span> },
    { key: 'datumOdectu', label: 'Datum odectu', render: m => <span className="text-muted text-sm">{m.datumOdectu ? formatCzDate(m.datumOdectu) : '—'}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meridla & Energie</h1>
          <p className="page-subtitle">{stats.celkem} meridel</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nove meridlo</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats.celkem)} color="var(--accent-blue)" />
        <KpiCard label="Elektrina" value={String(stats.elektrina)} color="var(--accent-orange)" />
        <KpiCard label="Voda" value={String(stats.voda)} color="var(--accent-blue)" />
        <KpiCard label="Plyn / Teplo" value={String(stats.plynTeplo)} color="var(--accent-red)" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat meridla..." onSearch={setSearch} />
      </div>

      <Table data={filtered} columns={columns} rowKey={m => m.id} onRowClick={m => setSelected(m)} emptyText="Zadna meridla" />

      {selected && (
        <MeterDetailModal
          meter={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}

      {showForm && (
        <MeterForm onClose={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
