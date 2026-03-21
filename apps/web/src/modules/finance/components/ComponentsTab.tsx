import { useState } from 'react';
import { Badge, Button, Modal, LoadingState, EmptyState } from '../../../shared/components';
import { useToast } from '../../../shared/components/toast/Toast';
import { useProperties, useProperty } from '../../properties/use-properties';
import GenerateFromComponentsWizard from './GenerateFromComponentsWizard';
import {
  usePropertyComponents,
  useCreateComponent,
  useUpdateComponent,
  useArchiveComponent,
  useAssignUnits,
  useRemoveAssignment,
  useUpdateAssignment,
  useComponentDetail,
} from '../api/components.queries';
import type { PrescriptionComponentSummary, ComponentAssignmentRow } from '../api/components.api';

/* ─── Formatting helpers ──────────────────────────────────────── */

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('cs-CZ');
}

/* ─── Czech labels ────────────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  ADVANCE: 'Záloha', FLAT_FEE: 'Paušál', FUND: 'Fond oprav',
  RENT: 'Nájem', DEPOSIT: 'Kauce', ANNUITY: 'Anuita', OTHER: 'Ostatní',
};

const METHOD_LABELS: Record<string, string> = {
  FIXED: 'Pevná částka', PER_AREA: 'Dle plochy (m\u00B2)', PER_HEATING_AREA: 'Dle vyt\u00E1p. plochy',
  PER_PERSON: 'Dle osob', PER_SHARE: 'Dle pod\u00EDlu', MANUAL: 'Ru\u010Dn\u00ED',
};

const METHOD_SUFFIX: Record<string, string> = {
  FIXED: 'K\u010D', PER_AREA: 'K\u010D/m\u00B2', PER_HEATING_AREA: 'K\u010D/m\u00B2',
  PER_PERSON: 'K\u010D/os.', PER_SHARE: 'K\u010D/pod\u00EDl', MANUAL: 'K\u010D',
};

const METHOD_HINTS: Record<string, string> = {
  FIXED: 'Pevn\u00E1 m\u011Bs\u00ED\u010Dn\u00ED \u010D\u00E1stka pro ka\u017Edou p\u0159i\u0159azenou jednotku',
  PER_AREA: 'Sazba \u00D7 podlahov\u00E1 plocha jednotky v m\u00B2',
  PER_HEATING_AREA: 'Sazba \u00D7 vyt\u00E1p\u011Bn\u00E1 plocha (pokud zad\u00E1na, jinak podlahov\u00E1)',
  PER_PERSON: 'Sazba \u00D7 po\u010Det osob v jednotce',
  PER_SHARE: 'Sazba \u00D7 pod\u00EDl na spole\u010Dn\u00FDch \u010D\u00E1stech (zlomek)',
  MANUAL: '\u010C\u00E1stka se nastav\u00ED individu\u00E1ln\u011B per jednotka',
};

const ALLOCATION_LABELS: Record<string, string> = {
  area: 'Dle plochy', share: 'Dle podílu', persons: 'Dle osob',
  consumption: 'Dle spotřeby', equal: 'Rovným dílem',
  heating_area: 'Dle vytáp. plochy', custom: 'Ruční',
};

const TYPE_BADGE_VARIANT: Record<string, string> = {
  ADVANCE: 'blue', FLAT_FEE: 'purple', FUND: 'green',
  RENT: 'yellow', DEPOSIT: 'muted', ANNUITY: 'blue', OTHER: 'muted',
};

/* ─── Styles ──────────────────────────────────────────────────── */

const thStyle: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-muted)' };
const tdStyle: React.CSSProperties = { padding: '8px 12px' };
const linkBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--primary, #3b82f6)', cursor: 'pointer', fontSize: '.82rem', textDecoration: 'underline', padding: 0 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box', fontSize: '.85rem' };
const selectStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem', marginBottom: 16 };

/* ─── Main Component ──────────────────────────────────────────── */

export default function ComponentsTab() {
  const { data: properties = [] } = useProperties();
  const [propertyId, setPropertyId] = useState<string>('');
  const [showAll, setShowAll] = useState(false);
  const { data: components = [], isLoading } = usePropertyComponents(propertyId || undefined, !showAll);
  const [editComponent, setEditComponent] = useState<PrescriptionComponentSummary | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [detailComponentId, setDetailComponentId] = useState<string | null>(null);
  const [assignComponentId, setAssignComponentId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const archiveMut = useArchiveComponent(propertyId);
  const toast = useToast();

  // Auto-select first property
  if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);

  if (!propertyId) return <EmptyState title="Žádná nemovitost" description="Nejprve vytvořte nemovitost." />;

  const handleArchive = async (comp: PrescriptionComponentSummary) => {
    if (!confirm(`Opravdu archivovat složku "${comp.name}"?`)) return;
    try {
      await archiveMut.mutateAsync(comp.id);
      toast.success(`Složka "${comp.name}" archivována.`);
      setActionMenuId(null);
    } catch {
      toast.error('Archivace se nezdařila.');
    }
  };

  return (
    <div>
      {/* Property selector */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        {properties.length > 1 && (
          <select
            value={propertyId}
            onChange={e => { setPropertyId(e.target.value); setDetailComponentId(null); setActionMenuId(null); }}
            style={selectStyle}
          >
            {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <Button variant="primary" size="sm" data-testid="finance-components-add-btn" onClick={() => { setEditComponent(null); setShowCreate(true); }}>
          Přidat složku
        </Button>
        {components.length > 0 && (
          <Button size="sm" onClick={() => setShowGenerate(true)}>
            Generovat předpisy
          </Button>
        )}
        <label style={{ fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
          Zobrazit archivované
        </label>
      </div>

      {isLoading ? <LoadingState text="Načítání složek..." /> :
       components.length === 0 ? <EmptyState title="Žádné složky předpisu" description="Vytvořte první složku předpisu tlačítkem výše." /> : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={thStyle}>Název</th>
                <th style={thStyle}>Kód</th>
                <th style={thStyle}>Typ</th>
                <th style={thStyle}>Výpočet</th>
                <th style={thStyle}>Rozúčtování</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Sazba</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>DPH</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Jednotek</th>
                <th style={thStyle}>Stav</th>
                <th style={thStyle}>Akce</th>
              </tr>
            </thead>
            <tbody>
              {components.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setDetailComponentId(c.id)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
                  <td style={tdStyle}>{c.code ?? '—'}</td>
                  <td style={tdStyle}>
                    <Badge variant={(TYPE_BADGE_VARIANT[c.componentType] ?? 'muted') as any}>
                      {TYPE_LABELS[c.componentType] ?? c.componentType}
                    </Badge>
                  </td>
                  <td style={tdStyle}>
                    <Badge variant="muted">{METHOD_LABELS[c.calculationMethod] ?? c.calculationMethod}</Badge>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{ALLOCATION_LABELS[(c as any).allocationMethod] ?? '—'}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                    {c.calculationMethod === 'MANUAL' ? '—' : `${fmtCzk(c.defaultAmount).replace(/\s*CZK\s*/, '')} ${METHOD_SUFFIX[c.calculationMethod] ?? ''}`}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{c.vatRate}%</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{c._count?.assignments ?? 0}</td>
                  <td style={tdStyle}>
                    {c.isActive
                      ? <Badge variant="green">Aktivní</Badge>
                      : <Badge variant="muted">Archivováno</Badge>
                    }
                  </td>
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setActionMenuId(actionMenuId === c.id ? null : c.id)}
                        style={{ ...linkBtnStyle, fontWeight: 600, fontSize: '.85rem', textDecoration: 'none' }}
                      >
                        &#8943;
                      </button>
                      {actionMenuId === c.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', zIndex: 50,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          minWidth: 160, padding: '4px 0',
                        }}>
                          <button
                            onClick={() => { setEditComponent(c); setShowCreate(true); setActionMenuId(null); }}
                            style={menuItemStyle}
                          >
                            Upravit
                          </button>
                          <button
                            onClick={() => { setAssignComponentId(c.id); setActionMenuId(null); }}
                            style={menuItemStyle}
                          >
                            Přiřadit jednotky
                          </button>
                          {c.isActive && (
                            <button
                              onClick={() => handleArchive(c)}
                              style={{ ...menuItemStyle, color: '#ef4444' }}
                            >
                              Archivovat
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <ComponentFormModal
          propertyId={propertyId}
          component={editComponent}
          onClose={() => { setShowCreate(false); setEditComponent(null); }}
          onSuccess={() => { setShowCreate(false); setEditComponent(null); }}
        />
      )}

      {/* Detail modal */}
      {detailComponentId && (
        <ComponentDetailModal
          propertyId={propertyId}
          componentId={detailComponentId}
          onClose={() => setDetailComponentId(null)}
        />
      )}

      {/* Assign modal */}
      {assignComponentId && (
        <AssignModal
          propertyId={propertyId}
          componentId={assignComponentId}
          onClose={() => setAssignComponentId(null)}
          onSuccess={() => setAssignComponentId(null)}
        />
      )}

      {showGenerate && propertyId && (
        <GenerateFromComponentsWizard
          propertyId={propertyId}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '8px 14px', border: 'none', background: 'none',
  color: 'var(--text)', fontSize: '.84rem', cursor: 'pointer',
};

/* ─── Component Form Modal (Create / Edit) ────────────────────── */

interface ComponentFormModalProps {
  propertyId: string;
  component: PrescriptionComponentSummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ComponentFormModal({ propertyId, component, onClose, onSuccess }: ComponentFormModalProps) {
  const toast = useToast();
  const createMut = useCreateComponent(propertyId);
  const updateMut = useUpdateComponent(propertyId);
  const isEdit = !!component;

  const [form, setForm] = useState({
    name: component?.name ?? '',
    code: component?.code ?? '',
    componentType: component?.componentType ?? 'ADVANCE',
    calculationMethod: component?.calculationMethod ?? 'FIXED',
    allocationMethod: (component as any)?.allocationMethod ?? 'area',
    defaultAmount: component?.defaultAmount?.toString() ?? '',
    vatRate: component?.vatRate?.toString() ?? '0',
    description: component?.description ?? '',
    accountingCode: component?.accountingCode ?? '',
    sortOrder: component?.sortOrder?.toString() ?? '0',
    effectiveFrom: component?.effectiveFrom ? component.effectiveFrom.slice(0, 10) : new Date().toISOString().slice(0, 10),
    effectiveTo: component?.effectiveTo ? component.effectiveTo.slice(0, 10) : '',
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const isManual = form.calculationMethod === 'MANUAL';

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Název je povinný.'); return; }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      componentType: form.componentType,
      calculationMethod: form.calculationMethod,
      allocationMethod: form.allocationMethod,
      defaultAmount: isManual ? 0 : parseFloat(form.defaultAmount) || 0,
      vatRate: parseFloat(form.vatRate) || 0,
      description: form.description.trim() || null,
      accountingCode: form.accountingCode.trim() || null,
      sortOrder: parseInt(form.sortOrder) || 0,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
    };

    try {
      if (isEdit && component) {
        await updateMut.mutateAsync({ componentId: component.id, data: payload });
        toast.success('Složka aktualizována.');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Složka vytvořena.');
      }
      onSuccess();
    } catch {
      toast.error(isEdit ? 'Úprava se nezdařila.' : 'Vytvoření se nezdařilo.');
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit složku' : 'Nová složka předpisu'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Name */}
        <div>
          <label className="form-label">Název *</label>
          <input data-testid="finance-component-form-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Např. Záloha na teplo" style={inputStyle} />
        </div>
        {/* Code */}
        <div>
          <label className="form-label">Kód</label>
          <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="Např. ZAL-TEPLO" style={inputStyle} />
        </div>
        {/* Component type */}
        <div>
          <label className="form-label">Typ</label>
          <select data-testid="finance-component-form-type" value={form.componentType} onChange={e => set('componentType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {/* Calculation method */}
        <div>
          <label className="form-label">Způsob výpočtu</label>
          <select data-testid="finance-component-form-method" value={form.calculationMethod} onChange={e => set('calculationMethod', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {METHOD_HINTS[form.calculationMethod] ?? ''}
          </div>
        </div>
        {/* Allocation method (for annual settlement) */}
        <div>
          <label className="form-label">Rozúčtování (vyúčtování)</label>
          <select value={form.allocationMethod} onChange={e => set('allocationMethod', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {Object.entries(ALLOCATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Způsob rozdělení skutečných nákladů při ročním vyúčtování
          </div>
        </div>
        {/* Default amount — hidden for MANUAL */}
        {!isManual && (
          <div>
            <label className="form-label">
              Sazba ({METHOD_SUFFIX[form.calculationMethod] ?? 'Kč'})
            </label>
            <input
              data-testid="finance-component-form-amount"
              type="number"
              min="0"
              step="0.01"
              value={form.defaultAmount}
              onChange={e => set('defaultAmount', e.target.value)}
              style={inputStyle}
            />
          </div>
        )}
        {/* VAT rate */}
        <div>
          <label className="form-label">Sazba DPH (%)</label>
          <input type="number" min="0" max="100" step="1" value={form.vatRate} onChange={e => set('vatRate', e.target.value)} style={inputStyle} />
        </div>
        {/* Accounting code */}
        <div>
          <label className="form-label">Účetní kód</label>
          <input value={form.accountingCode} onChange={e => set('accountingCode', e.target.value)} placeholder="Např. 324100" style={inputStyle} />
        </div>
        {/* Sort order */}
        <div>
          <label className="form-label">Pořadí</label>
          <input type="number" min="0" value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} style={inputStyle} />
        </div>
        {/* Effective from */}
        <div>
          <label className="form-label">Platnost od</label>
          <input type="date" value={form.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} style={inputStyle} />
        </div>
        {/* Effective to */}
        <div>
          <label className="form-label">Platnost do</label>
          <input type="date" value={form.effectiveTo} onChange={e => set('effectiveTo', e.target.value)} style={inputStyle} />
        </div>
      </div>
      {/* Description */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Popis</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={2}
          placeholder="Volitelný popis složky"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} data-testid="finance-component-form-cancel">Zrušit</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isPending || !form.name.trim()} data-testid="finance-component-form-save">
          {isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
        </Button>
      </div>
    </Modal>
  );
}

/* ─── Component Detail Modal ──────────────────────────────────── */

interface ComponentDetailModalProps {
  propertyId: string;
  componentId: string;
  onClose: () => void;
}

function ComponentDetailModal({ propertyId, componentId, onClose }: ComponentDetailModalProps) {
  const { data: detail, isLoading } = useComponentDetail(propertyId, componentId);
  const removeMut = useRemoveAssignment(propertyId);
  const updateAssignMut = useUpdateAssignment(propertyId);
  const toast = useToast();
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [editOverride, setEditOverride] = useState('');
  const [editNote, setEditNote] = useState('');
  const [showAssign, setShowAssign] = useState(false);

  const handleRemove = async (assignment: ComponentAssignmentRow) => {
    if (!confirm(`Odebrat přiřazení pro jednotku "${assignment.unit.name}"?`)) return;
    try {
      await removeMut.mutateAsync(assignment.id);
      toast.success('Přiřazení odebráno.');
    } catch {
      toast.error('Odebrání se nezdařilo.');
    }
  };

  const handleSaveOverride = async (assignmentId: string) => {
    try {
      const overrideAmount = editOverride.trim() === '' ? null : parseFloat(editOverride);
      await updateAssignMut.mutateAsync({ assignmentId, overrideAmount, note: editNote || undefined });
      toast.success('Přiřazení aktualizováno.');
      setEditingAssignment(null);
    } catch {
      toast.error('Úprava se nezdařila.');
    }
  };

  const startEdit = (a: ComponentAssignmentRow) => {
    setEditingAssignment(a.id);
    setEditOverride(a.overrideAmount != null ? String(a.overrideAmount) : '');
    setEditNote(a.note ?? '');
  };

  return (
    <Modal open onClose={onClose} wide title="">
      {isLoading || !detail ? <LoadingState text="Načítání..." /> : (
        <>
          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{detail.name}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <Badge variant={(TYPE_BADGE_VARIANT[detail.componentType] ?? 'muted') as any}>
                {TYPE_LABELS[detail.componentType] ?? detail.componentType}
              </Badge>
              <Badge variant="muted">
                {METHOD_LABELS[detail.calculationMethod] ?? detail.calculationMethod}
              </Badge>
              {detail.code && <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Kód: {detail.code}</span>}
            </div>
            {detail.description && (
              <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 6 }}>{detail.description}</div>
            )}
            <div style={{ fontSize: '.85rem', marginTop: 6 }}>
              Sazba: <strong>{detail.calculationMethod === 'MANUAL' ? 'Ruční' : `${fmtCzk(detail.defaultAmount)} ${METHOD_SUFFIX[detail.calculationMethod] ?? ''}`}</strong>
              {' | '}DPH: <strong>{detail.vatRate}%</strong>
              {' | '}Platnost od: <strong>{fmtDate(detail.effectiveFrom)}</strong>
              {detail.effectiveTo && <>{' '}do: <strong>{fmtDate(detail.effectiveTo)}</strong></>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginBottom: 12 }}>
            <Button size="sm" onClick={() => setShowAssign(true)}>Přiřadit jednotky</Button>
          </div>

          {/* Assignments table */}
          {detail.assignments.length === 0 ? (
            <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>Žádné přiřazené jednotky</div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={thStyle}>Jednotka</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Výchozí</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Override</th>
                    <th style={thStyle}>Platnost</th>
                    <th style={thStyle}>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.assignments.map(a => {
                    const isEditing = editingAssignment === a.id;
                    const defaultAmt = detail.calculationMethod === 'MANUAL' ? '—' : fmtCzk(detail.defaultAmount);
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 500 }}>{a.unit.name}</span>
                          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                            {a.unit.area != null && `${a.unit.area} m\u00B2`}
                            {a.unit.personCount != null && ` | ${a.unit.personCount} os.`}
                            {a.unit.commonAreaShare != null && ` | podíl ${a.unit.commonAreaShare}`}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{defaultAmt}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editOverride}
                              onChange={e => setEditOverride(e.target.value)}
                              placeholder="Bez override"
                              style={{ ...inputStyle, width: 120, textAlign: 'right', fontSize: '.82rem' }}
                            />
                          ) : (
                            <span style={{ fontFamily: 'monospace' }}>
                              {a.overrideAmount != null ? fmtCzk(a.overrideAmount) : '—'}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {fmtDate(a.effectiveFrom)}
                          {a.effectiveTo && ` — ${fmtDate(a.effectiveTo)}`}
                          {a.note && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{a.note}</div>}
                        </td>
                        <td style={tdStyle}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => handleSaveOverride(a.id)} style={{ ...linkBtnStyle, color: '#10b981' }} disabled={updateAssignMut.isPending}>
                                {updateAssignMut.isPending ? '...' : 'Uložit'}
                              </button>
                              <button onClick={() => setEditingAssignment(null)} style={linkBtnStyle}>Zrušit</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => startEdit(a)} style={linkBtnStyle}>Upravit</button>
                              <button onClick={() => handleRemove(a)} style={{ ...linkBtnStyle, color: '#ef4444' }} disabled={removeMut.isPending}>
                                Odebrat
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Inline assign modal */}
          {showAssign && (
            <AssignModal
              propertyId={propertyId}
              componentId={componentId}
              onClose={() => setShowAssign(false)}
              onSuccess={() => setShowAssign(false)}
            />
          )}
        </>
      )}
    </Modal>
  );
}

/* ─── Assign Modal ────────────────────────────────────────────── */

interface AssignModalProps {
  propertyId: string;
  componentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AssignModal({ propertyId, componentId, onClose, onSuccess }: AssignModalProps) {
  const toast = useToast();
  const { data: property } = useProperty(propertyId);
  const { data: detail } = useComponentDetail(propertyId, componentId);
  const assignMut = useAssignUnits(propertyId);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));

  const units = (property as any)?.units ?? [];
  const assignedUnitIds = new Set((detail?.assignments ?? []).map((a: ComponentAssignmentRow) => a.unitId));

  const toggleUnit = (unitId: string) => {
    if (assignedUnitIds.has(unitId)) return; // already assigned, skip
    setSelectedUnitIds(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const toggleAll = () => {
    const unassigned = units.filter((u: any) => !assignedUnitIds.has(u.id));
    if (selectedUnitIds.size === unassigned.length) {
      setSelectedUnitIds(new Set());
    } else {
      setSelectedUnitIds(new Set(unassigned.map((u: any) => u.id)));
    }
  };

  const newCount = selectedUnitIds.size;

  const handleSubmit = async () => {
    if (newCount === 0) return;
    try {
      await assignMut.mutateAsync({
        componentId,
        unitIds: Array.from(selectedUnitIds),
        effectiveFrom,
      });
      toast.success(`Přiřazeno ${newCount} jednotek.`);
      onSuccess();
    } catch {
      toast.error('Přiřazení se nezdařilo.');
    }
  };

  return (
    <Modal open onClose={onClose} title="Přiřadit jednotky">
      {!units.length ? <LoadingState text="Načítání jednotek..." /> : (
        <>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Platnost od</label>
            <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} style={{ ...inputStyle, width: 200 }} />
          </div>

          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
              Bude přiřazeno <strong>{newCount}</strong> jednotek
            </span>
            <button onClick={toggleAll} style={linkBtnStyle}>
              {selectedUnitIds.size === units.filter((u: any) => !assignedUnitIds.has(u.id)).length ? 'Odznačit vše' : 'Vybrat vše'}
            </button>
          </div>

          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            {units.map((u: any) => {
              const isAssigned = assignedUnitIds.has(u.id);
              const isSelected = selectedUnitIds.has(u.id);
              return (
                <label
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    cursor: isAssigned ? 'default' : 'pointer',
                    background: isAssigned ? 'var(--surface-2, #f3f4f6)' : isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
                    opacity: isAssigned ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAssigned || isSelected}
                    disabled={isAssigned}
                    onChange={() => toggleUnit(u.id)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '.85rem' }}>
                      {u.name}
                      {isAssigned && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (přiřazeno)</span>}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                      {u.area != null && `${u.area} m\u00B2`}
                      {u.personCount != null && ` | ${u.personCount} os.`}
                      {u.commonAreaShare != null && ` | podíl ${u.commonAreaShare}`}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <Button onClick={onClose}>Zrušit</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={assignMut.isPending || newCount === 0}>
              {assignMut.isPending ? 'Přiřazuji...' : `Přiřadit (${newCount})`}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
