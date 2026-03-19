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
import { usePropertyOwnerships, useUnitOwnershipsByProperty, type ApiOwnership } from './ownerships-api';
import { usePropertyTenancies, type ApiTenancy } from './tenancies-api';
import OwnershipFormModal from './OwnershipFormModal';
import TenancyFormModal from './TenancyFormModal';
import TenancyTerminateModal from './TenancyTerminateModal';
import ManagementContractFormModal from './ManagementContractFormModal';
import FinancialContextFormModal from './FinancialContextFormModal';

const MGMT_TYPE_BADGE: Record<string, { label: string; variant: string }> = {
  hoa_management: { label: 'SVJ', variant: 'blue' },
  rental_management: { label: 'Pronájem', variant: 'red' },
  technical_management: { label: 'Technická', variant: 'muted' },
  accounting_management: { label: 'Účetní', variant: 'yellow' },
  admin_management: { label: 'Administrativní', variant: 'purple' },
};

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: property, isLoading, error, refetch } = useProperty(id!);
  const { data: contracts = [] } = usePropertyContracts(id!);
  usePropertyFinancialContexts(id!);
  usePropertyOwnerships(id!);
  const { data: unitOwnerships = [] } = useUnitOwnershipsByProperty(id!);
  const { data: propTenancies = [] } = usePropertyTenancies(id!);
  const [showEditProp, setShowEditProp] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editUnit, setEditUnit] = useState<ApiUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<ApiUnit | null>(null);
  const [occupancyUnit, setOccupancyUnit] = useState<ApiUnit | null>(null);
  const [ownershipModal, setOwnershipModal] = useState<{ type: 'property' | 'unit'; unitId?: string; ownership?: ApiOwnership } | null>(null);
  const [tenancyModal, setTenancyModal] = useState<{ unitId: string; tenancy?: ApiTenancy } | null>(null);
  const [terminateModal, setTerminateModal] = useState<ApiTenancy | null>(null);
  const [contractModal, setContractModal] = useState<{ contract?: ApiManagementContract } | null>(null);
  const [fcModal, setFcModal] = useState<{ context?: ApiFinancialContext } | null>(null);

  type DetailTab = 'overview' | 'units' | 'meters' | 'components' | 'representatives' | 'owners'
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  const refetchOwnerships = () => queryClient.invalidateQueries({ queryKey: ['ownerships'] });

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
      key: 'name', label: 'Ozn. dle KN',
      render: (u) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--primary, #6366f1)' }}>{u.name}</span>
          {(u.ownDesignation || u.floor != null) && (
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
              {u.ownDesignation ?? ''}{u.floor != null ? ` / ${u.floor}. NP` : ''}
              {u.spaceType && u.spaceType !== 'RESIDENTIAL' ? `, ${u.spaceType === 'NON_RESIDENTIAL' ? 'nebyt.' : u.spaceType.toLowerCase()}` : ''}
            </div>
          )}
        </div>
      ),
    },
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

      {/* ── Tab navigation ──────────────────────────────────────────── */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {([
          { key: 'overview' as DetailTab, label: 'Přehled' },
          { key: 'units' as DetailTab, label: `Jednotky (${totalUnits})` },
          { key: 'owners' as DetailTab, label: 'Vlastníci' },
          { key: 'meters' as DetailTab, label: 'Měřidla' },
          { key: 'components' as DetailTab, label: 'Složky předpisu' },
          { key: 'representatives' as DetailTab, label: 'Zástupci' },
        ]).map(t => (
          <button key={t.key} className={`tab-btn${detailTab === t.key ? ' active' : ''}`} onClick={() => setDetailTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PŘEHLED TAB ──────────────────────────────────────────── */}
      {detailTab === 'overview' && <>

      {/* Základní informace */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Základní informace</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: '.85rem' }}>
          <div><span className="text-muted">Adresa:</span> {property.address}, {property.city} {property.postalCode}</div>
          <div><span className="text-muted">Typ:</span> {property.type}</div>
          <div><span className="text-muted">Forma:</span> {LEGAL_MODE_LABEL[property.legalMode ?? ''] ?? property.legalMode ?? '—'}</div>
          {property.ico && <div><span className="text-muted">IČO:</span> {property.ico}</div>}
          {property.dic && <div><span className="text-muted">DIČ:</span> {property.dic}</div>}
          {property.isVatPayer && <div><Badge variant="yellow">Plátce DPH</Badge></div>}
          {property.managedFrom && <div><span className="text-muted">Ve správě od:</span> {new Date(property.managedFrom).toLocaleDateString('cs-CZ')}</div>}
          {property.managedTo && <div><span className="text-muted">Ve správě do:</span> {new Date(property.managedTo).toLocaleDateString('cs-CZ')}</div>}
          {property.accountingSystem && property.accountingSystem !== 'NONE' && <div><span className="text-muted">Účetní systém:</span> {property.accountingSystem}</div>}
        </div>
        {(property as any).cadastralData && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: '.85rem' }}>
            {(property as any).cadastralData.parcelNumber && <div><span className="text-muted">Parcela:</span> {(property as any).cadastralData.parcelNumber}</div>}
            {(property as any).cadastralData.cadastralTerritory && <div><span className="text-muted">K.Ú.:</span> {(property as any).cadastralData.cadastralTerritory}</div>}
            {(property as any).cadastralData.buildingNumber && <div><span className="text-muted">Č.p.:</span> {(property as any).cadastralData.buildingNumber}</div>}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        {[
          { label: 'Vlastníků', value: unitOwnerships.filter((o: any) => o.isActive !== false).length },
          { label: 'Správců', value: contracts.length },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: '.82rem' }}>
            <span className="text-muted">{s.label}:</span> <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      </>}

      {/* ── JEDNOTKY TAB ─────────────────────────────────────────── */}
      {detailTab === 'units' && <>

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
          onRowClick={(u) => navigate(`/properties/${id}/units/${u.id}`)}
        />
      )}

      </>}

      {/* ── VLASTNÍCI TAB ────────────────────────────────────────── */}
      {detailTab === 'owners' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>Vlastníci jednotek ({unitOwnerships.length})</div>
          </div>
          {unitOwnerships.length === 0 ? (
            <EmptyState title="Žádní vlastníci" description="Jednotky nemají přiřazené vlastníky." />
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr>
                    {['Platnost', 'Ozn. dle KN', 'Jméno vlastníka', 'Podíl', 'Předpis', 'Konto'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', fontWeight: 600, fontSize: '.78rem', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unitOwnerships.map((o: any) => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => {
                      // Navigate to principal if available, otherwise just highlight
                      const principalId = o.party?.principals?.[0]?.id
                      if (principalId) navigate(`/principals/${principalId}`)
                    }}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                        <Badge variant="blue">od počátku</Badge>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary, #6366f1)' }}>{o.unit?.name ?? '—'}</div>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 500 }}>{o.party?.displayName?.replace(/^SJM\s+/i, 'SJ ') ?? '—'}</div>
                        {o.note && <div className="text-muted" style={{ fontSize: '.75rem' }}>{o.note}</div>}
                        <span style={{ marginTop: 2, display: 'inline-block' }}><Badge variant="muted">ISIR</Badge></span>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '.82rem' }}>
                        {o.shareNumerator && o.shareDenominator ? `${o.shareNumerator}/${o.shareDenominator}` : o.sharePercent ? `${Number(o.sharePercent).toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        nenalezen
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        0,00 Kč
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PLACEHOLDER TABS ─────────────────────────────────────── */}
      {detailTab === 'meters' && <EmptyState title="Měřidla" description="Přejděte do sekce Měřidla & Energie pro správu měřidel této nemovitosti." action={{ label: 'Otevřít měřidla', onClick: () => navigate('/meters') }} />}
      {detailTab === 'components' && <EmptyState title="Složky předpisu" description="Správa složek předpisu bude dostupná z detailu nemovitosti." />}
      {detailTab === 'representatives' && (
        <div>
          {contracts.length > 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '.9rem' }}>Zástupci — smlouvy o správě ({contracts.length})</div>
              {contracts.map((c: any) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{c.principal?.displayName ?? '—'}</span>
                    <span className="text-muted" style={{ marginLeft: 8 }}>{MGMT_TYPE_BADGE[c.type]?.label ?? c.type}</span>
                  </div>
                  <Badge variant={c.isActive ? 'green' : 'muted'}>{c.isActive ? 'Aktivní' : 'Ukončen'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Žádní zástupci" description="K nemovitosti nejsou přiřazeny žádné smlouvy o správě." />
          )}
        </div>
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

      {contractModal !== null && (
        <ManagementContractFormModal
          propertyId={id}
          contract={contractModal.contract}
          onClose={() => setContractModal(null)}
          onSaved={() => { setContractModal(null); queryClient.invalidateQueries({ queryKey: ['management-contracts'] }); }}
        />
      )}

      {fcModal !== null && (
        <FinancialContextFormModal
          propertyId={id}
          context={fcModal.context}
          onClose={() => setFcModal(null)}
          onSaved={() => { setFcModal(null); queryClient.invalidateQueries({ queryKey: ['financial-contexts'] }); }}
        />
      )}
    </div>
  );
}

