import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, AlertTriangle } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { apiClient } from '../../core/api/client';
import AssetForm from './AssetForm';

/* ─── types ──────────────────────────────────────────────────────── */

export interface Asset {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  status: string;
  purchaseDate: string | null;
  purchaseValue: number | null;
  warrantyUntil: string | null;
  serviceInterval: number | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  notes: string | null;
  propertyId: string | null;
  unitId: string | null;
  assetTypeId: string | null;
  property: { id: string; name: string } | null;
  unit: { id: string; name: string } | null;
  assetType: { id: string; name: string; code: string; _count?: { activityAssignments: number } } | null;
  _count?: { serviceRecords: number };
}

interface Stats {
  total: number;
  inWarranty: number;
  needsService: number;
  totalValue: number;
}

/* ─── constants ──────────────────────────────────────────────────── */

const STATUS_LABEL: Record<string, string> = { aktivni: 'Aktivní', servis: 'V servisu', vyrazeno: 'Vyřazeno', neaktivni: 'Neaktivní' };
const STATUS_COLOR: Record<string, BadgeVariant> = { aktivni: 'green', servis: 'yellow', vyrazeno: 'red', neaktivni: 'muted' };

const CATEGORY_LABEL: Record<string, string> = {
  tzb: 'TZB', stroje: 'Stroje', vybaveni: 'Vybavení',
  vozidla: 'Vozidla', it: 'IT', ostatni: 'Ostatní',
};

const CATEGORIES = ['', 'tzb', 'stroje', 'vybaveni', 'vozidla', 'it', 'ostatni'];

/* ─── component ──────────────────────────────────────────────────── */

export default function AssetListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: assets = [], refetch } = useQuery<Asset[]>({
    queryKey: ['assets', 'list', catFilter],
    queryFn: () => apiClient.get('/assets', {
      params: { category: catFilter || undefined },
    }).then((r) => r.data),
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['assets', 'stats'],
    queryFn: () => apiClient.get('/assets/stats').then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = search
    ? assets.filter((a) => {
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q)
          || (a.manufacturer ?? '').toLowerCase().includes(q)
          || (a.model ?? '').toLowerCase().includes(q)
          || (a.serialNumber ?? '').toLowerCase().includes(q);
      })
    : assets;

  const handleExport = () => {
    apiClient.get('/assets/export', { responseType: 'blob' }).then((res) => {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'assets.csv'; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const now = Date.now();

  const columns: Column<Asset>[] = [
    { key: 'name', label: 'Název', render: (a) => <span style={{ fontWeight: 600 }}>{a.name}</span> },
    { key: 'category', label: 'Kategorie', render: (a) => (
      <Badge variant="blue">{CATEGORY_LABEL[a.category] ?? a.category}</Badge>
    ) },
    { key: 'manufacturer', label: 'Výrobce', render: (a) => a.manufacturer || '—' },
    { key: 'property', label: 'Nemovitost', render: (a) => (
      <span className="text-muted">{a.property?.name ?? '—'}</span>
    ) },
    { key: 'status', label: 'Stav', render: (a) => (
      <Badge variant={STATUS_COLOR[a.status] ?? 'muted'}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
    ) },
    { key: 'warrantyUntil', label: 'Záruka', render: (a) => {
      if (!a.warrantyUntil) return <span className="text-muted">—</span>;
      const expired = new Date(a.warrantyUntil).getTime() < now;
      return (
        <span style={{ color: expired ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
          {expired && <AlertTriangle size={12} style={{ marginRight: 3, verticalAlign: -1 }} />}
          {new Date(a.warrantyUntil).toLocaleDateString('cs-CZ')}
        </span>
      );
    } },
    { key: 'nextServiceDate', label: 'Příští servis', render: (a) => {
      if (!a.nextServiceDate) return <span className="text-muted">—</span>;
      const days = Math.ceil((new Date(a.nextServiceDate).getTime() - now) / 86_400_000);
      return (
        <span style={{ color: days <= 0 ? 'var(--danger)' : days <= 30 ? 'var(--accent-orange)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
          {days <= 0 ? `Prošlý` : `${days}d`}
        </span>
      );
    } },
  ];

  return (
    <div data-testid="asset-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pasportizace</h1>
          <p className="page-subtitle">{stats?.total ?? 0} zařízení</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<Download size={15} />} onClick={handleExport}>CSV</Button>
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)} data-testid="asset-add-btn">Nové zařízení</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem aktiv" value={String(stats?.total ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="V záruce" value={String(stats?.inWarranty ?? 0)} color="var(--accent-green)" />
        <KpiCard label="Potřebuje servis" value={String(stats?.needsService ?? 0)} color="var(--accent-red)" />
        <KpiCard label="Celková hodnota" value={`${((stats?.totalValue ?? 0) / 1000).toFixed(0)}k Kč`} color="var(--accent-orange)" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <SearchBar placeholder="Hledat zařízení..." onSearch={setSearch} />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem',
          }}
        >
          <option value="">Všechny kategorie</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>

      <Table data={filtered} columns={columns} rowKey={(a) => a.id} onRowClick={(a) => navigate(`/assets/${a.id}`)} emptyText="Žádná zařízení" />

      {showForm && (
        <AssetForm onClose={() => { setShowForm(false); refetch(); }} />
      )}
    </div>
  );
}
