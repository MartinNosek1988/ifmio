import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Layers, Trash2 } from 'lucide-react';
import { KpiCard, Table, Badge, Button, Modal, EmptyState, LoadingState, ErrorState } from '../../shared/components';
import type { Column } from '../../shared/components';
import { useProperty } from './use-properties';
import { propertiesApi } from './properties-api';
import type { ApiUnit } from './properties-api';
import PropertyForm, { LEGAL_MODE_LABEL } from './PropertyForm';
import UnitForm, { SPACE_TYPES } from './UnitForm';
import BulkUnitForm from './BulkUnitForm';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: property, isLoading, error, refetch } = useProperty(id!);
  const [showEditProp, setShowEditProp] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editUnit, setEditUnit] = useState<ApiUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<ApiUnit | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (unitId: string) => propertiesApi.deleteUnit(id!, unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setDeleteUnit(null);
    },
  });

  if (isLoading) return <LoadingState />;
  if (error || !property) {
    return (
      <div>
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/properties')}>Zpět</Button>
        <ErrorState message="Nemovitost nenalezena nebo nastala chyba." />
      </div>
    );
  }

  const units = property.units ?? [];
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.isOccupied).length;
  const totalArea = units.reduce((s, u) => s + (u.area ?? 0), 0);

  const unitColumns: Column<ApiUnit>[] = [
    { key: 'name', label: 'Název', render: (u) => <span style={{ fontWeight: 600 }}>{u.name}</span> },
    { key: 'floor', label: 'Patro', render: (u) => u.floor != null ? String(u.floor) : '—' },
    {
      key: 'area', label: 'Plocha', align: 'right',
      render: (u) => u.area != null
        ? <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.area.toFixed(1)}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'spaceType', label: 'Typ',
      render: (u) => {
        const st = SPACE_TYPES.find(s => s.value === u.spaceType);
        return st && st.value !== 'RESIDENTIAL'
          ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{st.label}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>;
      },
    },
    {
      key: 'commonAreaShare', label: 'Podíl %', align: 'right',
      render: (u) => u.commonAreaShare != null
        ? <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{(Number(u.commonAreaShare) * 100).toFixed(4)}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'personCount', label: 'Osoby', align: 'right',
      render: (u) => u.personCount != null ? String(u.personCount) : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'owner', label: 'Vlastník',
      render: (u) => {
        // TODO: Backend includes occupancies with residents — display first active owner
        const occ = u.occupancies?.find((o: any) => o.resident);
        return occ ? <span style={{ fontSize: '0.82rem' }}>{occ.resident.lastName} {occ.resident.firstName}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>;
      },
    },
    {
      key: 'isOccupied', label: 'Status',
      render: (u) => (
        <Badge variant={u.isOccupied ? 'green' : 'blue'}>
          {u.isOccupied ? 'Obsazeno' : 'Volné'}
        </Badge>
      ),
    },
    {
      key: 'actions', label: '',
      render: (u) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setEditUnit(u)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: 'var(--text-muted)' }}
            title="Upravit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteUnit(u)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: 'var(--danger)' }}
            title="Smazat"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeft size={15} />} onClick={() => navigate('/properties')}>Zpět</Button>
      </div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{property.name}</h1>
          <p className="page-subtitle">
            {[property.address, property.city].filter(Boolean).join(', ')}
          </p>
          {/* P0 info strip */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', fontSize: '0.82rem' }}>
            {property.legalMode && property.legalMode !== 'OWNERSHIP' && (
              <Badge variant={property.legalMode === 'SVJ' ? 'purple' : property.legalMode === 'BD' ? 'blue' : 'muted'}>
                {LEGAL_MODE_LABEL[property.legalMode] ?? property.legalMode}
              </Badge>
            )}
            {property.ico && <span style={{ color: 'var(--text-muted)' }}>IČ: <strong>{property.ico}</strong>{property.dic ? ` / DIČ: ${property.dic}` : ''}</span>}
            {property.isVatPayer && <Badge variant="yellow">DPH</Badge>}
            {property.managedFrom && (
              <span style={{ color: 'var(--text-muted)' }}>
                Správa: {new Date(property.managedFrom).toLocaleDateString('cs-CZ')}
                {property.managedTo ? ` – ${new Date(property.managedTo).toLocaleDateString('cs-CZ')}` : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<Pencil size={15} />} onClick={() => setShowEditProp(true)}>Upravit</Button>
          <Button icon={<Layers size={15} />} onClick={() => setShowBulk(true)}>Hromadné</Button>
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowAddUnit(true)}>
            Nová jednotka
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Jednotek" value={String(totalUnits)} color="var(--accent-blue)" />
        <KpiCard label="Obsazeno" value={String(occupiedUnits)} color="var(--accent-green)" />
        <KpiCard label="Volné" value={String(totalUnits - occupiedUnits)} color="var(--accent-orange)" />
        <KpiCard
          label="Celková plocha"
          value={totalArea > 0 ? `${totalArea.toFixed(1)} m²` : '—'}
          color="var(--accent-purple)"
        />
      </div>

      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
        Jednotky
        {totalUnits > 0 && (
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.85rem' }}>
            {totalUnits} celkem{totalArea > 0 ? ` · ${totalArea.toFixed(1)} m²` : ''}
          </span>
        )}
      </h2>
      {units.length === 0 ? (
        <EmptyState
          title="Žádné jednotky"
          description="Přidejte jednotky tlačítkem 'Nová jednotka' nebo 'Hromadné'."
        />
      ) : (
        <Table
          data={units}
          columns={unitColumns}
          rowKey={(u) => u.id}
          onRowClick={(u) => setEditUnit(u)}
        />
      )}

      {/* Edit property */}
      {showEditProp && (
        <PropertyForm property={property} onClose={() => setShowEditProp(false)} />
      )}

      {/* Add single unit */}
      {showAddUnit && (
        <UnitForm
          propertyId={property.id}
          onClose={() => setShowAddUnit(false)}
          onSuccess={() => { setShowAddUnit(false); refetch(); }}
        />
      )}

      {/* Edit unit */}
      {editUnit && (
        <UnitForm
          propertyId={property.id}
          unit={editUnit}
          onClose={() => setEditUnit(null)}
          onSuccess={() => { setEditUnit(null); refetch(); }}
        />
      )}

      {/* Bulk add */}
      {showBulk && (
        <BulkUnitForm
          propertyId={property.id}
          propertyName={property.name}
          onClose={() => setShowBulk(false)}
          onSuccess={() => { setShowBulk(false); refetch(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteUnit && (
        <Modal
          open
          onClose={() => setDeleteUnit(null)}
          title="Smazat jednotku"
          subtitle={deleteUnit.name}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteUnit(null)}>Zrušit</Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(deleteUnit.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }
        >
          <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            Opravdu chcete smazat jednotku <strong>{deleteUnit.name}</strong>?
          </p>
          {deleteUnit.isOccupied && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', color: 'var(--danger)' }}>
              Tato jednotka je aktuálně obsazena.
            </div>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Tato akce je nevratná.
          </p>
          {deleteMutation.isError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>
              Nepodařilo se smazat jednotku.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
