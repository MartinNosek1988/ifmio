import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button } from '../../shared/components';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import type { Column, BadgeVariant } from '../../shared/components';
import { useContracts, useContractStats, useDeleteContract } from './api/contracts.queries';
import type { ApiLeaseAgreement } from './api/contracts.api';
import { formatKc, formatCzDate } from '../../shared/utils/format';
import LeaseDetailModal from './LeaseDetailModal';
import LeaseForm from './LeaseForm';

const STATUS_COLOR: Record<string, BadgeVariant> = {
  aktivni: 'green', ukoncena: 'muted', pozastavena: 'yellow', pripravovana: 'blue',
};
const STATUS_LABEL: Record<string, string> = {
  aktivni: 'Aktivní', ukoncena: 'Ukončená', pozastavena: 'Pozastavená', pripravovana: 'Připravovaná',
};

function daysToExpiry(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(c: ApiLeaseAgreement): boolean {
  const days = daysToExpiry(c.endDate);
  return days !== null && days >= 0 && days <= 30 && c.status === 'aktivni';
}

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<ApiLeaseAgreement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiLeaseAgreement | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (filterStatus !== 'all') p.status = filterStatus;
    if (search) p.search = search;
    return p;
  }, [filterStatus, search]);

  const { data: contracts, isLoading, isError, refetch } = useContracts(params);
  const { data: stats } = useContractStats();
  const deleteMutation = useDeleteContract();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); if (selected?.id === deleteTarget.id) setSelected(null); },
    });
  };

  if (isLoading) return <LoadingState text="Nacitani smluv..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const items = contracts ?? [];

  const columns: Column<ApiLeaseAgreement>[] = [
    {
      key: 'contractNumber', label: 'Cislo', render: (c) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{c.contractNumber || '—'}</span>
      ),
    },
    {
      key: 'resident', label: 'Najemnik', render: (c) => (
        <span style={{ fontWeight: 600 }}>
          {c.resident ? `${c.resident.firstName} ${c.resident.lastName}` : '—'}
        </span>
      ),
    },
    {
      key: 'property', label: 'Nemovitost', render: (c) => (
        <span className="text-muted">
          {c.property?.name || '—'}
          {c.unit ? ` · ${c.unit.name}` : ''}
        </span>
      ),
    },
    { key: 'startDate', label: 'Od', render: (c) => <span className="text-sm">{formatCzDate(c.startDate)}</span> },
    {
      key: 'endDate', label: 'Do', render: (c) => (
        <span className="text-sm">
          {c.endDate ? formatCzDate(c.endDate) : 'Neurcito'}
          {isExpiringSoon(c) && (
            <span style={{ marginLeft: 6 }}><Badge variant="yellow">{daysToExpiry(c.endDate)}d</Badge></span>
          )}
        </span>
      ),
    },
    {
      key: 'monthlyRent', label: 'Najem/mes', align: 'right',
      render: (c) => <span className="font-semibold">{formatKc(c.monthlyRent)}</span>,
    },
    {
      key: 'status', label: 'Stav',
      render: (c) => <Badge variant={STATUS_COLOR[c.status] || 'muted'}>{STATUS_LABEL[c.status] || c.status}</Badge>,
    },
    {
      key: 'actions', label: '', align: 'right',
      render: (c) => (
        <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteTarget(c); }}
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '3px 8px', fontSize: '0.75rem' }}>
          Smazat
        </Button>
      ),
    },
  ];

  return (
    <div data-testid="contract-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Najemni smlouvy</h1>
          <p className="page-subtitle">{stats?.active ?? 0} aktivních smluv</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)} data-testid="contract-add-btn">Nova smlouva</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem smluv" value={String(stats?.total ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Aktivních" value={String(stats?.active ?? 0)} color="var(--accent-green)" />
        <KpiCard label="Expiruje do 30 dní" value={String(stats?.expiringSoon ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="Ukončených" value={String(stats?.terminated ?? 0)} color="var(--text-muted)" />
      </div>

      <div className="flex-bar" style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Hledat nájemníka, číslo smlouvy..." onSearch={setSearch} />
        <select className="btn" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Vse</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Table data={items} columns={columns} rowKey={(c) => c.id} onRowClick={(c) => setSelected(c)} emptyText="Žádné nájemní smlouvy" />

      {selected && (
        <LeaseDetailModal
          lease={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); }}
        />
      )}

      {showForm && (
        <LeaseForm onClose={() => setShowForm(false)} />
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
            <h3 style={{ marginBottom: 8 }}>Smazat smlouvu?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
              Opravdu chcete smazat smlouvu <strong>{deleteTarget.contractNumber}</strong>
              {deleteTarget.resident ? ` (${deleteTarget.resident.firstName} ${deleteTarget.resident.lastName})` : ''}? Tuto akci nelze vratit.
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
