import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { KpiCard, Table, Badge, Button, EmptyState, LoadingState, ErrorState } from '../../shared/components';
import type { Column } from '../../shared/components';
import { useProperty } from './use-properties';
import type { ApiUnit } from './properties-api';
import PropertyForm from './PropertyForm';
import UnitForm from './UnitForm';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: property, isLoading, error, refetch } = useProperty(id!);
  const [showEditProp, setShowEditProp] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);

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

  const unitColumns: Column<ApiUnit>[] = [
    { key: 'name', label: 'Název', render: (u) => <span style={{ fontWeight: 600 }}>{u.name}</span> },
    { key: 'floor', label: 'Patro', render: (u) => u.floor != null ? String(u.floor) : '—' },
    { key: 'area', label: 'Plocha', render: (u) => u.area != null ? `${u.area} m²` : '—' },
    {
      key: 'isOccupied', label: 'Status',
      render: (u) => (
        <Badge variant={u.isOccupied ? 'green' : 'blue'}>
          {u.isOccupied ? 'Obsazeno' : 'Volné'}
        </Badge>
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
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<Pencil size={15} />} onClick={() => setShowEditProp(true)}>Upravit</Button>
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowAddUnit(true)}>
            Nová jednotka
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Jednotek" value={String(totalUnits)} color="var(--accent-blue)" />
        <KpiCard label="Obsazeno" value={String(occupiedUnits)} color="var(--accent-green)" />
        <KpiCard label="Volné" value={String(totalUnits - occupiedUnits)} color="var(--accent-orange)" />
        <KpiCard label="Obsazenost" value={totalUnits ? `${Math.round((occupiedUnits / totalUnits) * 100)} %` : '—'} color="var(--accent-purple)" />
      </div>

      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Jednotky</h2>
      {units.length === 0 ? (
        <EmptyState title="Žádné jednotky" description="Zatím zde nejsou žádné jednotky." />
      ) : (
        <Table data={units} columns={unitColumns} rowKey={(u) => u.id} />
      )}

      {showEditProp && (
        <PropertyForm property={property} onClose={() => setShowEditProp(false)} />
      )}
      {showAddUnit && (
        <UnitForm
          propertyId={property.id}
          onClose={() => setShowAddUnit(false)}
          onSuccess={() => { setShowAddUnit(false); refetch(); }}
        />
      )}
    </div>
  );
}