import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import type { Column, BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { DOC_TYPE_LABELS, label } from '../../constants/labels';
import { useDocuments, useDocStats } from './api/documents.queries';
import { formatFileSize, type ApiDocument } from './api/documents.api';
import DocumentDetailModal from './DocumentDetailModal';
import DocumentForm from './DocumentForm';

const CAT_COLOR: Record<string, BadgeVariant> = {
  contract: 'blue', invoice: 'green', protocol: 'yellow',
  photo: 'purple', plan: 'blue', regulation: 'red', other: 'muted',
};

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selected, setSelected] = useState<ApiDocument | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Support ?entityType=ticket&entityId=xxx from "Otevřít spis" link
  const urlParams = new URLSearchParams(window.location.search);
  const entityTypeParam = urlParams.get('entityType');
  const entityIdParam = urlParams.get('entityId');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (entityTypeParam && entityIdParam) {
      p.entityType = entityTypeParam;
      p.entityId = entityIdParam;
    } else if (filterCategory !== 'all' && filterCategory !== 'helpdesk') {
      p.category = filterCategory;
    }
    if (search) p.search = search;
    return p;
  }, [filterCategory, search, entityTypeParam, entityIdParam]);

  const { data: listData, isLoading, isError, refetch } = useDocuments(params);
  const { data: stats } = useDocStats();

  if (isLoading) return <LoadingState text="Nacitani dokumentu..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  // Client-side filter for "helpdesk" pill — show only HD- prefixed documents
  const allItems = listData?.data ?? [];
  const items = filterCategory === 'helpdesk' ? allItems.filter(d => d.name.startsWith('HD-')) : allItems;

  const columns: Column<ApiDocument>[] = [
    { key: 'name', label: 'Nazev', render: d => <span style={{ fontWeight: 600 }}>{d.name}</span> },
    { key: 'category', label: 'Kategorie', render: d => <Badge variant={CAT_COLOR[d.category] || 'muted'}>{label(DOC_TYPE_LABELS, d.category)}</Badge> },
    {
      key: 'tags', label: 'Stitky', render: d => d.tags.length > 0 ? (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {d.tags.slice(0, 3).map(t => (
            <span key={t.id} style={{ padding: '1px 6px', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.72rem' }}>{t.tag}</span>
          ))}
          {d.tags.length > 3 && <span className="text-muted text-sm">+{d.tags.length - 3}</span>}
        </div>
      ) : <span className="text-muted">—</span>,
    },
    { key: 'createdAt', label: 'Nahrano', render: d => <span className="text-muted text-sm">{formatCzDate(d.createdAt)}</span> },
    { key: 'size', label: 'Velikost', align: 'right', render: d => <span className="text-muted">{formatFileSize(d.size)}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dokumenty</h1>
          <p className="page-subtitle">{stats?.total ?? 0} dokumentu</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nahrat dokument</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats?.total ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Smlouvy" value={String(stats?.contract ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Faktury" value={String(stats?.invoice ?? 0)} color="var(--accent-green)" />
        <KpiCard label="Protokoly" value={String(stats?.protocol ?? 0)} color="var(--accent-orange)" />
      </div>

      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat dokumenty..." onSearch={setSearch} />
        <select className="btn" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">Vše</option>
          <option value="helpdesk">Helpdesk</option>
          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Zadne dokumenty" description="Nahrajte prvni dokument." />
      ) : (
        <Table data={items} columns={columns} rowKey={d => d.id} onRowClick={d => setSelected(d)} />
      )}

      {selected && (
        <DocumentDetailModal
          document={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => setSelected(null)}
        />
      )}

      {showForm && (
        <DocumentForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
