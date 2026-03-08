import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { useComplianceStore } from './compliance-store';
import { formatCzDate } from '../../shared/utils/format';
import { NC_STATUS_LABELS, NC_SEVERITY_LABELS, CA_STATUS_LABELS, label } from '../../constants/labels';
import type { NonConformity, CorrectiveAction } from './types';
import NonConformityDetailModal from './NonConformityDetailModal';

const NC_STATUS_COLOR: Record<string, BadgeVariant> = { otevrena: 'red', v_reseni: 'yellow', uzavrena: 'green' };
const NC_SEV_COLOR: Record<string, BadgeVariant> = { kriticka: 'red', vysoka: 'yellow', normalni: 'blue', nizka: 'muted' };
const CA_STATUS_COLOR: Record<string, BadgeVariant> = { planovana: 'blue', v_realizaci: 'yellow', dokoncena: 'green' };

export default function CompliancePage() {
  const { nonConformities, correctiveActions, load } = useComplianceStore();
  const [searchNC, setSearchNC] = useState('');
  const [searchCA, setSearchCA] = useState('');
  const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null);

  useEffect(() => { load(); }, [load]);

  const filteredNC = useMemo(() => {
    if (!searchNC) return nonConformities;
    const q = searchNC.toLowerCase();
    return nonConformities.filter(n => n.nazev.toLowerCase().includes(q) || n.popis.toLowerCase().includes(q));
  }, [nonConformities, searchNC]);

  const filteredCA = useMemo(() => {
    if (!searchCA) return correctiveActions;
    const q = searchCA.toLowerCase();
    return correctiveActions.filter(c => c.nazev.toLowerCase().includes(q) || c.zodpovedny.toLowerCase().includes(q));
  }, [correctiveActions, searchCA]);

  const stats = useMemo(() => ({
    ncTotal: nonConformities.length,
    ncOpen: nonConformities.filter(n => n.stav !== 'uzavrena').length,
    caTotal: correctiveActions.length,
    caDone: correctiveActions.filter(c => c.stav === 'dokoncena').length,
  }), [nonConformities, correctiveActions]);

  const ncColumns: Column<NonConformity>[] = [
    { key: 'nazev', label: 'Nazev', render: n => <span style={{ fontWeight: 600 }}>{n.nazev}</span> },
    { key: 'kategorie', label: 'Kategorie', render: n => <Badge variant="blue">{n.kategorie}</Badge> },
    { key: 'zavaznost', label: 'Zavaznost', render: n => <Badge variant={NC_SEV_COLOR[n.zavaznost] || 'muted'}>{label(NC_SEVERITY_LABELS, n.zavaznost)}</Badge> },
    { key: 'stav', label: 'Stav', render: n => <Badge variant={NC_STATUS_COLOR[n.stav] || 'muted'}>{label(NC_STATUS_LABELS, n.stav)}</Badge> },
    { key: 'datumZjisteni', label: 'Zjisteno', render: n => <span className="text-muted text-sm">{formatCzDate(n.datumZjisteni)}</span> },
    { key: 'terminNapravy', label: 'Termin napravy', render: n => <span className="text-muted text-sm">{formatCzDate(n.terminNapravy)}</span> },
  ];

  const caColumns: Column<CorrectiveAction>[] = [
    { key: 'nazev', label: 'Nazev', render: c => <span style={{ fontWeight: 600 }}>{c.nazev}</span> },
    { key: 'zodpovedny', label: 'Zodpovedny', render: c => c.zodpovedny },
    { key: 'stav', label: 'Stav', render: c => <Badge variant={CA_STATUS_COLOR[c.stav] || 'muted'}>{label(CA_STATUS_LABELS, c.stav)}</Badge> },
    { key: 'popis', label: 'Popis', render: c => <span className="text-muted text-sm">{c.popis}</span> },
    { key: 'terminSplneni', label: 'Termin', render: c => <span className="text-muted text-sm">{formatCzDate(c.terminSplneni)}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance &mdash; ISO 41001</h1>
          <p className="page-subtitle">Neshody a napravna opatreni</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />}>Nova neshoda</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Neshody celkem" value={String(stats.ncTotal)} color="var(--accent-blue)" />
        <KpiCard label="Otevrenych neshod" value={String(stats.ncOpen)} color="var(--accent-red)" />
        <KpiCard label="Napravna opatreni" value={String(stats.caTotal)} color="var(--accent-orange)" />
        <KpiCard label="Dokonceno" value={String(stats.caDone)} color="var(--accent-green)" />
      </div>

      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Neshody (Non-Conformities)</h2>
      <div style={{ marginBottom: 12 }}>
        <SearchBar placeholder="Hledat neshody..." onSearch={setSearchNC} />
      </div>
      <div style={{ marginBottom: 32 }}>
        <Table data={filteredNC} columns={ncColumns} rowKey={n => n.id} onRowClick={n => setSelectedNC(n)} emptyText="Zadne neshody" />
      </div>

      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Napravna opatreni (Corrective Actions)</h2>
      <div style={{ marginBottom: 12 }}>
        <SearchBar placeholder="Hledat opatreni..." onSearch={setSearchCA} />
      </div>
      <Table data={filteredCA} columns={caColumns} rowKey={c => c.id} emptyText="Zadna napravna opatreni" />

      {selectedNC && (
        <NonConformityDetailModal
          item={selectedNC}
          onClose={() => setSelectedNC(null)}
          onUpdated={() => { load(); setSelectedNC(null); }}
        />
      )}
    </div>
  );
}
