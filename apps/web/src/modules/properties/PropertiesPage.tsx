import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState, LoadingState, ErrorState } from '../../shared/components';
import type { Column } from '../../shared/components';
import { PROPERTY_TYPE_LABELS, label } from '../../constants/labels';
import { useProperties } from './use-properties';
import type { ApiProperty } from './properties-api';
import PropertyForm, { LEGAL_MODE_LABEL } from './PropertyForm';

const OWNERSHIP_LABELS: Record<string, string> = {
  vlastnictvi: 'Vlastnictví',
  druzstvo: 'Družstvo',
  pronajem: 'Pronájem',
};

export default function PropertiesPage() {
  const navigate = useNavigate();
  const { data: properties = [], isLoading, error } = useProperties();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return properties;
    const q = search.toLowerCase();
    return properties.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q)
    );
  }, [properties, search]);

  const stats = useMemo(() => {
    const totalUnits = properties.reduce((s, p) => s + (p.units?.length ?? 0), 0);
    const occupied = properties.reduce(
      (s, p) => s + (p.units?.filter((u) => u.isOccupied).length ?? 0), 0
    );
    return {
      count: properties.length,
      units: totalUnits,
      occupied,
      pct: totalUnits ? Math.round((occupied / totalUnits) * 100) : 0,
    };
  }, [properties]);

  const columns: Column<ApiProperty>[] = [
    {
      key: 'name', label: 'Název', render: (p) => (
        <div>
          <div style={{ fontWeight: 600 }}>{p.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {[p.address, p.city].filter(Boolean).join(', ')}
          </div>
        </div>
      ),
    },
    {
      key: 'type', label: 'Typ',
      render: (p) => <Badge variant="blue">{label(PROPERTY_TYPE_LABELS, p.type) || p.type}</Badge>,
    },
    {
      key: 'ownership', label: 'Vlastnictví',
      render: (p) => OWNERSHIP_LABELS[p.ownership] || p.ownership,
    },
    {
      key: 'legalMode', label: 'Režim',
      render: (p) => p.legalMode ? (
        <Badge variant={p.legalMode === 'SVJ' ? 'purple' : p.legalMode === 'BD' ? 'blue' : 'muted'}>
          {LEGAL_MODE_LABEL[p.legalMode] ?? p.legalMode}
        </Badge>
      ) : '—',
    },
    {
      key: 'ico', label: 'IČ',
      render: (p) => p.ico ? <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.ico}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'units', label: 'Jednotek',
      render: (p) => String(p.units?.length ?? 0),
    },
    {
      key: 'obsazenost', label: 'Obsazenost',
      render: (p) => {
        const total = p.units?.length ?? 0;
        const occ = p.units?.filter((u) => u.isOccupied).length ?? 0;
        return `${occ}/${total}`;
      },
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Nepodařilo se načíst nemovitosti." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nemovitosti</h1>
          <p className="page-subtitle">{stats.count} nemovitostí, {stats.units} jednotek</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
          Nová nemovitost
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Nemovitosti" value={String(stats.count)} color="var(--accent-blue)" icon={<Building2 size={18} />} />
        <KpiCard label="Jednotek celkem" value={String(stats.units)} color="var(--accent-orange)" />
        <KpiCard label="Obsazeno" value={String(stats.occupied)} color="var(--accent-green)" />
        <KpiCard label="Obsazenost" value={`${stats.pct} %`} color="var(--accent-purple)" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat nemovitost..." onSearch={setSearch} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Žádné nemovitosti" description="Přidejte svou první nemovitost." />
      ) : (
        <Table
          data={filtered}
          columns={columns}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/properties/${p.id}`)}
        />
      )}

      {showForm && (
        <PropertyForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
