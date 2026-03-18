import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Layers, Trash2, UserPlus } from 'lucide-react';
import { KpiCard, Table, Badge, Button, Modal, EmptyState, LoadingState, ErrorState } from '../../shared/components';
import type { Column } from '../../shared/components';
import { useProperty } from './use-properties';
import { propertiesApi } from './properties-api';
import type { ApiUnit } from './properties-api';
import PropertyForm, { LEGAL_MODE_LABEL } from './PropertyForm';
import UnitForm, { SPACE_TYPES } from './UnitForm';
import BulkUnitForm from './BulkUnitForm';
import OccupancyForm from './OccupancyForm';
import { usePropertyContracts, type ApiManagementContract } from './management-contracts-api';
import { usePropertyFinancialContexts, type ApiFinancialContext } from './financial-contexts-api';
import { usePropertyOwnerships, useUnitOwnershipsByProperty, type ApiOwnership, ownershipsApi } from './ownerships-api';
import { usePropertyTenancies, type ApiTenancy } from './tenancies-api';
import OwnershipFormModal from './OwnershipFormModal';
import TenancyFormModal from './TenancyFormModal';
import TenancyTerminateModal from './TenancyTerminateModal';

const MGMT_TYPE_BADGE: Record<string, { label: string; variant: string }> = {
  hoa_management: { label: 'SVJ', variant: 'blue' },
  rental_management: { label: 'Pronájem', variant: 'red' },
  technical_management: { label: 'Technická', variant: 'muted' },
  accounting_management: { label: 'Účetní', variant: 'yellow' },
  admin_management: { label: 'Administrativní', variant: 'purple' },
};

const SCOPE_LABELS: Record<string, string> = {
  property: 'Nemovitost',
  principal: 'Principál',
  manager: 'Správce',
  manual: 'Ruční',
};

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: property, isLoading, error, refetch } = useProperty(id!);
  const { data: contracts = [] } = usePropertyContracts(id!);
  const { data: finContexts = [] } = usePropertyFinancialContexts(id!);
  const { data: propOwnerships = [] } = usePropertyOwnerships(id!);
  const { data: unitOwnerships = [] } = useUnitOwnershipsByProperty(id!);
  const { data: propTenancies = [] } = usePropertyTenancies(id!);
  const [showEditProp, setShowEditProp] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editUnit, setEditUnit] = useState<ApiUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<ApiUnit | null>(null);
  const [occupancyUnit, setOccupancyUnit] = useState<ApiUnit | null>(null);
  const [activeFinContextId, setActiveFinContextId] = useState<string | null>(null);
  const [ownershipModal, setOwnershipModal] = useState<{ type: 'property' | 'unit'; unitId?: string; ownership?: ApiOwnership } | null>(null);
  const [tenancyModal, setTenancyModal] = useState<{ unitId: string; tenancy?: ApiTenancy } | null>(null);
  const [terminateModal, setTerminateModal] = useState<ApiTenancy | null>(null);

  const refetchOwnerships = () => {
    queryClient.invalidateQueries({ queryKey: ['ownerships'] });
  };

  const handleDeleteOwnership = async (ownerType: 'property' | 'unit', ownershipId: string) => {
    if (!window.confirm('Odebrat vlastnictví?')) return;
    try {
      if (ownerType === 'property') await ownershipsApi.removePropertyOwnership(ownershipId);
      else await ownershipsApi.removeUnitOwnership(ownershipId);
      refetchOwnerships();
    } catch { /* ignore */ }
  };

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

  // Build a map: unitId → list of contracts covering it
  // whole_property contracts cover all units
  const wholePropertyContracts = contracts.filter(c => c.scope === 'whole_property');

  function getUnitContractBadges(_unit: ApiUnit) {
    // whole_property contracts always apply; selected_units would need unit-level data from API
    return wholePropertyContracts;
  }

  // Build maps: unitId → ownerships and unitId → tenancies
  const unitOwnershipMap: Record<string, ApiOwnership[]> = {};
  for (const o of unitOwnerships) {
    const uid = o.unit?.id ?? '';
    if (!unitOwnershipMap[uid]) unitOwnershipMap[uid] = [];
    unitOwnershipMap[uid].push(o);
  }

  const unitTenancyMap: Record<string, ApiTenancy[]> = {};
  for (const t of propTenancies) {
    const uid = t.unit?.id ?? t.unitId;
    if (!unitTenancyMap[uid]) unitTenancyMap[uid] = [];
    unitTenancyMap[uid].push(t);
  }

  // Check if property has SVJ-style contracts (show ownership share column)
  const hasSvjContract = contracts.some(c => c.type === 'hoa_management');

  const unitColumns: Column<ApiUnit>[] = [
    {
      key: 'name', label: 'Název',
      render: (u) => {
        const badges = getUnitContractBadges(u);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{u.name}</span>
            {badges.map(c => {
              const b = MGMT_TYPE_BADGE[c.type] ?? { label: c.type, variant: 'muted' };
              return (
                <span
                  key={c.id}
                  className={`badge badge--${b.variant}`}
                  style={{ fontSize: '0.65rem', padding: '1px 5px', lineHeight: 1.3 }}
                  title={`${b.label} — ${c.principal.displayName}`}
                >
                  {c.principal.displayName.length > 12
                    ? c.principal.displayName.slice(0, 12) + '…'
                    : c.principal.displayName}
                </span>
              );
            })}
          </div>
        );
      },
    },
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
    ...(hasSvjContract ? [{
      key: 'ownerShare', label: 'Podíl',
      render: (u: ApiUnit) => {
        const owners = unitOwnershipMap[u.id] ?? [];
        if (owners.length === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        const o = owners[0];
        if (o.shareNumerator != null && o.shareDenominator != null) {
          return <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{o.shareNumerator}/{o.shareDenominator}</span>;
        }
        if (o.sharePercent != null) {
          return <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{Number(o.sharePercent).toFixed(2)}%</span>;
        }
        return <span style={{ color: 'var(--text-muted)' }}>—</span>;
      },
    }] as Column<ApiUnit>[] : []),
    {
      key: 'owner', label: 'Vlastník/Nájemce',
      render: (u) => {
        // Show Party-based ownership/tenancy if available
        const owners = unitOwnershipMap[u.id] ?? [];
        const tenancies = unitTenancyMap[u.id]?.filter(t => t.isActive) ?? [];

        if (owners.length > 0 || tenancies.length > 0) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }} onClick={(e) => e.stopPropagation()}>
              {owners.map(o => (
                <span key={o.id} style={{ fontSize: '0.82rem', fontWeight: 500 }}>{o.party.displayName}</span>
              ))}
              {tenancies.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {t.party.displayName}
                    <span className={`badge badge--${t.type === 'lease' ? 'blue' : 'muted'}`} style={{ fontSize: '0.6rem', padding: '0 4px', marginLeft: 4 }}>
                      {t.type === 'lease' ? 'nájem' : t.type === 'sublease' ? 'podnájem' : t.type}
                    </span>
                  </span>
                  <button onClick={() => setTenancyModal({ unitId: u.id, tenancy: t })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }} title="Upravit"><Pencil size={11} /></button>
                  <button onClick={() => setTerminateModal(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--danger)' }} title="Ukončit"><Trash2 size={11} /></button>
                </div>
              ))}
              {tenancies.length === 0 && (
                <button onClick={() => setTenancyModal({ unitId: u.id })} style={{ background: 'none', border: '1px solid var(--primary, #6366f1)', borderRadius: 4, cursor: 'pointer', color: 'var(--primary, #6366f1)', fontSize: '0.7rem', padding: '1px 6px' }}>+ nájemce</button>
              )}
            </div>
          );
        }

        // Fallback to legacy occupancy data
        const occ = u.occupancies?.find((o: any) => o.resident);
        if (occ) {
          const r = occ.resident;
          const name = r.isLegalEntity && r.companyName ? r.companyName : `${r.lastName} ${r.firstName}`;
          return (
            <button onClick={(e) => { e.stopPropagation(); setOccupancyUnit(u); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '0.82rem', padding: 0, textDecoration: 'underline dotted', textUnderlineOffset: 2 }} title="Spravovat vlastníky/nájemce">
              {name}
            </button>
          );
        }
        return (
          <button onClick={(e) => { e.stopPropagation(); setOccupancyUnit(u); }} style={{ background: 'none', border: '1px solid var(--primary, #6366f1)', borderRadius: 4, cursor: 'pointer', color: 'var(--primary, #6366f1)', fontSize: '0.78rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <UserPlus size={12} /> Přiřadit
          </button>
        );
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
            {contracts.length > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>
                Kontexty správy: <strong>{contracts.length}</strong>
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

      {/* ── Kontexty správy ────────────────────────────────────────── */}
      <ContractsSection contracts={contracts} navigate={navigate} />

      {/* ── Finanční kontexty ──────────────────────────────────────── */}
      {finContexts.length > 0 && (
        <FinancialContextsSection
          contexts={finContexts}
          activeId={activeFinContextId}
          onSelect={setActiveFinContextId}
        />
      )}

      {/* ── Vlastníci nemovitosti ─────────────────────────────────── */}
      <PropertyOwnershipsSection
        ownerships={propOwnerships}
        onAdd={() => setOwnershipModal({ type: 'property' })}
        onEdit={(o) => setOwnershipModal({ type: 'property', ownership: o })}
        onDelete={(o) => handleDeleteOwnership('property', o.id)}
      />

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

      {/* Occupancy assignment */}
      {occupancyUnit && (
        <OccupancyForm
          propertyId={property.id}
          unitId={occupancyUnit.id}
          unitName={occupancyUnit.name}
          propertyLegalMode={property.legalMode}
          onSuccess={() => { setOccupancyUnit(null); refetch(); }}
          onClose={() => setOccupancyUnit(null)}
        />
      )}

      {ownershipModal && (
        <OwnershipFormModal
          type={ownershipModal.type}
          propertyId={id}
          unitId={ownershipModal.unitId}
          ownership={ownershipModal.ownership}
          onClose={() => setOwnershipModal(null)}
          onSaved={() => { setOwnershipModal(null); refetchOwnerships(); }}
        />
      )}

      {tenancyModal && (
        <TenancyFormModal
          unitId={tenancyModal.unitId}
          propertyId={id!}
          tenancy={tenancyModal.tenancy}
          onClose={() => setTenancyModal(null)}
          onSaved={() => { setTenancyModal(null); refetch(); queryClient.invalidateQueries({ queryKey: ['tenancies'] }); }}
        />
      )}

      {terminateModal && (
        <TenancyTerminateModal
          tenancy={terminateModal}
          onClose={() => setTerminateModal(null)}
          onTerminated={() => { setTerminateModal(null); refetch(); }}
        />
      )}
    </div>
  );
}

// ─── Contracts Section ──────────────────────────────────────────────────

function ContractsSection({ contracts, navigate }: { contracts: ApiManagementContract[]; navigate: (path: string) => void }) {
  if (contracts.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
        Kontexty správy
        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.85rem' }}>
          {contracts.length}
        </span>
      </h2>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {contracts.map((c, i) => {
          const b = MGMT_TYPE_BADGE[c.type] ?? { label: c.type, variant: 'muted' };
          const scopeLabel = c.scope === 'whole_property'
            ? 'celý dům'
            : `${c._count.units} ${c._count.units === 1 ? 'jednotka' : c._count.units < 5 ? 'jednotky' : 'jednotek'}`;
          return (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                borderBottom: i < contracts.length - 1 ? '1px solid var(--border)' : undefined,
                fontSize: '0.85rem',
              }}
            >
              <Badge variant={b.variant as any}>{b.label}</Badge>
              <button
                onClick={() => navigate(`/principals/${c.principalId}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontWeight: 500, padding: 0, textDecoration: 'underline dotted', textUnderlineOffset: 2, fontSize: '0.85rem' }}
              >
                {c.principal.displayName}
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{scopeLabel}</span>
              {c.contractNo && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 'auto' }}>č. {c.contractNo}</span>}
              <span style={{ color: 'var(--accent-green, #22c55e)', fontSize: '0.78rem', marginLeft: c.contractNo ? 0 : 'auto' }}>&#10003;</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Financial Contexts Section ─────────────────────────────────────────

function FinancialContextsSection({
  contexts,
  activeId,
  onSelect,
}: {
  contexts: ApiFinancialContext[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const showAll = contexts.length > 1;

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
        Finanční kontexty
        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.85rem' }}>
          {contexts.length}
        </span>
      </h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {showAll && (
          <button
            onClick={() => onSelect(null)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: activeId === null ? 'var(--primary, #6366f1)' : 'var(--surface)',
              color: activeId === null ? '#fff' : 'var(--text)',
            }}
          >
            Vše
          </button>
        )}
        {contexts.map(fc => {
          const isActive = activeId === fc.id;
          return (
            <button
              key={fc.id}
              onClick={() => onSelect(isActive && showAll ? null : fc.id)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: isActive ? 'var(--primary, #6366f1)' : 'var(--surface)',
                color: isActive ? '#fff' : 'var(--text)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              title={fc.code ? `Kód: ${fc.code}` : undefined}
            >
              {fc.displayName}
              {fc.vatPayer && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>DPH</span>}
            </button>
          );
        })}
      </div>
      {/* Active context indicator */}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        Zobrazeno pro: <strong>{activeId ? contexts.find(fc => fc.id === activeId)?.displayName ?? '—' : 'Vše'}</strong>
      </div>
      {/* Detail of selected context */}
      {activeId && <FinancialContextDetail context={contexts.find(fc => fc.id === activeId)!} />}
    </div>
  );
}

function FinancialContextDetail({ context }: { context: ApiFinancialContext }) {
  if (!context) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: '0.85rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div><span className="text-muted">Název:</span> {context.displayName}</div>
        <div><span className="text-muted">Typ:</span> {SCOPE_LABELS[context.scopeType] ?? context.scopeType}</div>
        <div><span className="text-muted">Měna:</span> {context.currency}</div>
        {context.code && <div><span className="text-muted">Kód:</span> {context.code}</div>}
        <div><span className="text-muted">DPH:</span> {context.vatPayer ? 'Plátce' : 'Neplátce'}</div>
        <div><span className="text-muted">Bankovní účty:</span> {context._count.bankAccounts}</div>
        {context.principal && (
          <div><span className="text-muted">Principál:</span> {context.principal.displayName}</div>
        )}
        {context.invoicePrefix && <div><span className="text-muted">Prefix faktur:</span> {context.invoicePrefix}</div>}
      </div>
    </div>
  );
}

// ─── Property Ownerships Section ────────────────────────────────────────

const OWNERSHIP_ROLE_LABELS: Record<string, string> = {
  legal_owner: 'vlastník',
  beneficial_owner: 'spoluvlastník',
  managing_owner: 'správce',
  silent_coowner: 'tichý',
};

function PropertyOwnershipsSection({ ownerships, onAdd, onEdit, onDelete }: {
  ownerships: ApiOwnership[];
  onAdd: () => void;
  onEdit: (o: ApiOwnership) => void;
  onDelete: (o: ApiOwnership) => void;
}) {
  const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' };
  const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
          Vlastníci nemovitosti
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.85rem' }}>
            {ownerships.length}
          </span>
        </h2>
        <Button size="sm" onClick={onAdd}>+ Přidat vlastníka</Button>
      </div>
      {ownerships.length === 0 ? (
        <div className="text-muted" style={{ fontSize: '.85rem' }}>Žádní vlastníci nemovitosti.</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Subjekt</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Podíl</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Od</th>
                <th style={{ ...thStyle, width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {ownerships.map(o => (
                <tr key={o.id}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500 }}>{o.party.displayName}</span>
                    {o.party.ic && <span className="text-muted text-sm" style={{ marginLeft: 8 }}>IČ: {o.party.ic}</span>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                    {o.shareNumerator != null && o.shareDenominator != null
                      ? `${o.shareNumerator}/${o.shareDenominator}`
                      : o.sharePercent != null ? `${Number(o.sharePercent).toFixed(1)}%` : '—'}
                  </td>
                  <td style={tdStyle} className="text-muted">{OWNERSHIP_ROLE_LABELS[o.role] ?? o.role}</td>
                  <td style={tdStyle} className="text-muted">
                    {o.validFrom ? new Date(o.validFrom).toLocaleDateString('cs-CZ') : '—'}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button onClick={() => onEdit(o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text-muted)' }} title="Upravit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--danger)' }} title="Odebrat">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
