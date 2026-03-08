import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { ASSET_STATUS_LABELS, REVISION_STATUS_LABELS, label } from '../../constants/labels';
import { useAssetStore, type Asset, daysToRevize } from './asset-store';
import AssetDetailModal from './AssetDetailModal';
import AssetForm from './AssetForm';

const STAV_COLOR: Record<string, BadgeVariant> = { aktivni: 'green', servis: 'yellow', vyrazeno: 'red', neaktivni: 'muted' };
const REV_COLOR: Record<string, BadgeVariant> = { ok: 'green', blizi_se: 'yellow', prosla: 'red' };

export default function AssetListPage() {
  const { assets, load, getStats } = useAssetStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [load]);

  const stats = getStats();

  const filtered = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(a =>
      a.nazev.toLowerCase().includes(q) ||
      (a.typNazev || '').toLowerCase().includes(q) ||
      (a.vyrobce || '').toLowerCase().includes(q)
    );
  }, [assets, search]);

  const columns: Column<Asset>[] = [
    { key: 'nazev', label: 'Nazev', render: a => <span style={{ fontWeight: 600 }}>{a.nazev}</span> },
    { key: 'typNazev', label: 'Typ', render: a => a.typNazev ? <Badge variant="blue">{a.typNazev}</Badge> : <span className="text-muted">—</span> },
    { key: 'vyrobce', label: 'Vyrobce', render: a => a.vyrobce || '—' },
    { key: 'umisteni', label: 'Umisteni', render: a => <span className="text-muted">{a.umisteni || '—'}</span> },
    { key: 'stav', label: 'Stav', render: a => <Badge variant={STAV_COLOR[a.stav] || 'muted'}>{label(ASSET_STATUS_LABELS, a.stav)}</Badge> },
    { key: 'stavRevize', label: 'Revize', render: a => <Badge variant={REV_COLOR[a.stavRevize] || 'muted'}>{label(REVISION_STATUS_LABELS, a.stavRevize)}</Badge> },
    { key: 'pristiRevize', label: 'Pristi revize', render: a => {
      const days = daysToRevize(a.pristiRevize);
      if (days == null) return <span className="text-muted">—</span>;
      return (
        <span style={{ color: days <= 0 ? 'var(--danger)' : days <= 30 ? 'var(--accent-orange)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
          {days <= 0 ? `Prosla` : `${days}d`}
        </span>
      );
    }},
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Asset Management</h1>
          <p className="page-subtitle">{stats.celkem} zarizeni</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nove zarizeni</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats.celkem)} color="var(--accent-blue)" />
        <KpiCard label="Aktivnich" value={String(stats.aktivnich)} color="var(--accent-green)" />
        <KpiCard label="Po revizi" value={String(stats.poRevizi)} color="var(--accent-red)" />
        <KpiCard label="V servisu" value={String(stats.vServisu)} color="var(--accent-orange)" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat zarizeni..." onSearch={setSearch} />
      </div>

      <Table data={filtered} columns={columns} rowKey={a => a.id} onRowClick={a => setSelected(a)} emptyText="Zadna zarizeni" />

      {selected && (
        <AssetDetailModal
          asset={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}

      {showForm && (
        <AssetForm onClose={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
