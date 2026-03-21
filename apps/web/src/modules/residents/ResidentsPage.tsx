import { useMemo, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, Modal, LoadingState, ErrorState } from '../../shared/components';
import type { Column } from '../../shared/components';
import { useResidents, useDeleteResident } from './api/residents.queries';
import type { ApiResident } from './api/residents.api';
import ResidentDetailModal from './ResidentDetailModal';
import ResidentForm from './ResidentForm';
import { ResidentImportWizard } from './import/ResidentImportWizard';

export default function ResidentsPage() {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedResident, setSelectedResident] = useState<ApiResident | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editResident, setEditResident] = useState<ApiResident | null>(null);
  const [deleteResident, setDeleteResident] = useState<ApiResident | null>(null);
  const [showImport, setShowImport] = useState(false);

  const { data: paginated, isLoading, error } = useResidents({
    ...(search ? { search } : {}),
    ...(filterRole !== 'all' ? { role: filterRole } : {}),
    limit: 100,
  });

  const deleteMutation = useDeleteResident();

  const residents = paginated?.data ?? [];
  const total = paginated?.total ?? 0;

  const stats = useMemo(() => {
    const propertyIds = new Set(residents.map(r => r.propertyId).filter(Boolean));
    const withDebt = residents.filter(r => r.hasDebt).length;
    return {
      celkem: total,
      aktivnich: residents.length,
      nemovitosti: propertyIds.size,
      dluznici: withDebt,
    };
  }, [residents, total]);

  const ROLE_LABELS: Record<string, string> = {
    owner: 'Vlastník',
    tenant: 'Nájemce',
    member: 'Člen',
    contact: 'Kontakt',
  };

  const columns: Column<ApiResident>[] = [
    {
      key: 'name', label: 'Jméno', render: (r) => (
        <div>
          <span style={{ fontWeight: 600 }}>
            {r.isLegalEntity && r.companyName ? r.companyName : `${r.firstName} ${r.lastName}`}
          </span>
          {r.isLegalEntity && (
            <span style={{ marginLeft: 6, fontSize: '0.7rem', padding: '1px 5px', borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 600 }}>PO</span>
          )}
          {r.isLegalEntity && r.companyName && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.firstName} {r.lastName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'property', label: 'Nemovitost', render: (r) => (
        <div>
          <span className="text-muted">{r.property?.name ?? '—'}</span>
          {r.unit && <div className="text-muted text-sm">Jednotka {r.unit.name}</div>}
        </div>
      ),
    },
    { key: 'phone', label: 'Telefon', render: (r) => r.phone || '—' },
    { key: 'email', label: 'Email', render: (r) => <span className="text-muted text-sm">{r.email || '—'}</span> },
    {
      key: 'role', label: 'Role', render: (r) => (
        <Badge variant="blue">{ROLE_LABELS[r.role] || r.role}</Badge>
      ),
    },
    {
      key: 'debt', label: 'Dluh', render: (r) => (
        r.hasDebt
          ? <Badge variant="red">Dluh</Badge>
          : <span className="text-muted">—</span>
      ),
    },
    {
      key: 'party', label: 'Adresář', render: (r) => (
        r.party
          ? <span className="text-muted text-sm" title={`Party: ${r.party.displayName}`}>→ {r.party.displayName}</span>
          : <span className="text-muted">—</span>
      ),
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Nepodařilo se načíst bydlící." />;

  const handleDeleteConfirm = () => {
    if (!deleteResident) return;
    deleteMutation.mutate(deleteResident.id, {
      onSuccess: () => {
        setDeleteResident(null);
        // If detail modal was showing this resident, close it too
        if (selectedResident?.id === deleteResident.id) {
          setSelectedResident(null);
        }
      },
    });
  };

  return (
    <div data-testid="resident-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bydlící</h1>
          <p className="page-subtitle">{stats.aktivnich} aktivních bydlících</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<Upload size={15} />} onClick={() => setShowImport(true)}>Import</Button>
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)} data-testid="resident-add-btn">Nový bydlící</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(stats.celkem)} color="var(--accent-blue)" />
        <KpiCard label="Aktivních" value={String(stats.aktivnich)} color="var(--accent-green)" />
        <KpiCard label="Nemovitostí" value={String(stats.nemovitosti)} color="var(--accent-orange)" />
        <KpiCard label="Dlužníků" value={String(stats.dluznici)} color="var(--accent-red, var(--danger))" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat bydlící..." onSearch={setSearch} data-testid="resident-search-input" /></div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
          <option value="all">Všechny role</option>
          <option value="owner">Vlastníci</option>
          <option value="tenant">Nájemci</option>
          <option value="member">Členové</option>
          <option value="contact">Kontakty</option>
        </select>
      </div>

      <Table
        data={residents}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => setSelectedResident(r)}
        emptyText="Žádní bydlící"
        data-testid="resident-list"
      />

      {selectedResident && (
        <ResidentDetailModal
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
          onUpdated={() => setSelectedResident(null)}
          onDelete={() => {
            setDeleteResident(selectedResident);
            setSelectedResident(null);
          }}
        />
      )}

      {showForm && (
        <ResidentForm onClose={() => setShowForm(false)} />
      )}

      {editResident && (
        <ResidentForm
          resident={editResident}
          onClose={() => setEditResident(null)}
        />
      )}

      {showImport && (
        <ResidentImportWizard onClose={() => setShowImport(false)} />
      )}

      {/* Delete confirmation modal */}
      {deleteResident && (
        <Modal
          open
          onClose={() => setDeleteResident(null)}
          title="Smazat bydlícího"
          subtitle={`${deleteResident.firstName} ${deleteResident.lastName}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteResident(null)} data-testid="resident-delete-cancel">Zrušit</Button>
              <Button
                variant="danger"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                data-testid="resident-delete-confirm"
              >
                {deleteMutation.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }
        >
          <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            Opravdu chcete smazat bydlícího <strong>{deleteResident.firstName} {deleteResident.lastName}</strong>?
          </p>
          {deleteResident.hasDebt && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', color: 'var(--danger)' }}>
              Tento bydlící má evidovaný dluh.
            </div>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Tato akce je nevratná.
          </p>
          {deleteMutation.isError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>
              Nepodařilo se smazat bydlícího.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
