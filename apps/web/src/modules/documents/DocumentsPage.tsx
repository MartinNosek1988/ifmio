import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { formatCzDate } from '../../shared/utils/format';
import { DOC_TYPE_LABELS, label } from '../../constants/labels';
import { useDocumentStore, type Document, formatVelikost } from './document-store';
import DocumentDetailModal from './DocumentDetailModal';
import DocumentForm from './DocumentForm';

const TYP_COLOR: Record<string, BadgeVariant> = {
  smlouva: 'blue', revize: 'yellow', faktura: 'green',
  pasport: 'purple', pojisteni: 'yellow', ostatni: 'muted',
};

export default function DocumentsPage() {
  const { documents, load, getStats } = useDocumentStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Document | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [load]);

  const stats = getStats();

  const filtered = useMemo(() => {
    if (!search) return documents;
    const q = search.toLowerCase();
    return documents.filter(d =>
      d.nazev.toLowerCase().includes(q) ||
      (d.popis || '').toLowerCase().includes(q)
    );
  }, [documents, search]);

  const columns: Column<Document>[] = [
    { key: 'nazev', label: 'Nazev', render: d => <span style={{ fontWeight: 600 }}>{d.nazev}</span> },
    { key: 'typ', label: 'Typ', render: d => <Badge variant={TYP_COLOR[d.typ] || 'muted'}>{label(DOC_TYPE_LABELS, d.typ)}</Badge> },
    { key: 'datum', label: 'Datum', render: d => <span className="text-muted text-sm">{d.datum ? formatCzDate(d.datum) : '—'}</span> },
    { key: 'velikost', label: 'Velikost', align: 'right', render: d => <span className="text-muted">{formatVelikost(d.velikost)}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dokumenty</h1>
          <p className="page-subtitle">{stats.celkem} dokumentu</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>Nahrat dokument</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats.celkem)} color="var(--accent-blue)" />
        <KpiCard label="Smlouvy" value={String(stats.smlouvy)} color="var(--accent-blue)" />
        <KpiCard label="Revize" value={String(stats.revize)} color="var(--accent-orange)" />
        <KpiCard label="Faktury" value={String(stats.faktury)} color="var(--accent-green)" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat dokumenty..." onSearch={setSearch} />
      </div>

      <Table data={filtered} columns={columns} rowKey={d => d.id} onRowClick={d => setSelected(d)} emptyText="Zadne dokumenty" />

      {selected && (
        <DocumentDetailModal
          document={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}

      {showForm && (
        <DocumentForm onClose={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
