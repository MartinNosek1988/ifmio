import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { propertiesApi } from './properties-api';
import type { ApiUnit, SpaceTypeValue } from './properties-api';

interface Props {
  propertyId: string;
  unit?: ApiUnit;
  onClose: () => void;
  onSuccess?: () => void;
}

const SPACE_TYPES: { value: SpaceTypeValue; label: string }[] = [
  { value: 'RESIDENTIAL', label: 'Bytový' },
  { value: 'NON_RESIDENTIAL', label: 'Nebytový' },
  { value: 'GARAGE', label: 'Garáž' },
  { value: 'PARKING', label: 'Parkovací stání' },
  { value: 'CELLAR', label: 'Sklep' },
  { value: 'LAND', label: 'Pozemek' },
];

export { SPACE_TYPES };

export default function UnitForm({ propertyId, unit, onClose, onSuccess }: Props) {
  const isEdit = !!unit;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: unit?.name ?? '',
    knDesignation: unit?.knDesignation ?? '',
    ownDesignation: unit?.ownDesignation ?? '',
    spaceType: (unit?.spaceType ?? 'RESIDENTIAL') as SpaceTypeValue,
    disposition: unit?.disposition ?? '',
    floor: unit?.floor != null ? String(unit.floor) : '',
    area: unit?.area != null ? String(unit.area) : '',
    heatingArea: unit?.heatingArea != null ? String(unit.heatingArea) : '',
    commonAreaShare: unit?.commonAreaShare != null ? String(Number(unit.commonAreaShare) * 100) : '',
    personCount: unit?.personCount != null ? String(unit.personCount) : '',
    hasElevator: unit?.hasElevator ?? false,
    heatingMethod: unit?.heatingMethod ?? '',
    heatingCoefficient: unit?.heatingCoefficient != null ? String(unit.heatingCoefficient) : '1.0',
    tuvArea: unit?.tuvArea != null ? String(unit.tuvArea) : '',
    extAllocatorRef: unit?.extAllocatorRef ?? '',
    validFrom: unit?.validFrom ? unit.validFrom.slice(0, 10) : '',
    validTo: unit?.validTo ? unit.validTo.slice(0, 10) : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTech, setShowTech] = useState(false);
  const [showValidity, setShowValidity] = useState(!!unit?.validFrom);

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const share = form.commonAreaShare ? parseFloat(form.commonAreaShare) : undefined;
      const payload = {
        name: form.name.trim(),
        floor: form.floor ? parseInt(form.floor) : undefined,
        area: form.area ? parseFloat(form.area) : undefined,
        knDesignation: form.knDesignation || null,
        ownDesignation: form.ownDesignation || null,
        spaceType: form.spaceType,
        disposition: form.disposition || null,
        heatingArea: form.heatingArea ? parseFloat(form.heatingArea) : null,
        commonAreaShare: share != null && !isNaN(share) ? share / 100 : null, // UI % → DB fraction
        personCount: form.personCount ? parseInt(form.personCount) : null,
        hasElevator: form.hasElevator || null,
        heatingMethod: form.heatingMethod || null,
        heatingCoefficient: form.heatingCoefficient ? parseFloat(form.heatingCoefficient) : null,
        tuvArea: form.tuvArea ? parseFloat(form.tuvArea) : null,
        extAllocatorRef: form.extAllocatorRef || null,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      };
      return isEdit
        ? propertiesApi.updateUnit(propertyId, unit!.id, payload)
        : propertiesApi.createUnit(propertyId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onSuccess?.();
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Název je povinný';
    const share = parseFloat(form.commonAreaShare);
    if (form.commonAreaShare && (isNaN(share) || share < 0 || share > 100)) errs.commonAreaShare = 'Podíl musí být 0–100 %';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  const inputStyle = (field?: string): React.CSSProperties => ({
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box',
  });

  const hintStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 };

  return (
    <Modal
      open onClose={onClose}
      title={isEdit ? `Upravit — ${unit!.name}` : 'Nová jednotka'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      {/* ── Identifikace ─────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Název jednotky *</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Byt 1, Garáž G1..." style={inputStyle('name')} />
        {errors.name && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="form-label">KN označení</label>
          <input value={form.knDesignation} onChange={(e) => set('knDesignation', e.target.value)} placeholder="např. 123/45" maxLength={30} style={inputStyle()} />
          <div style={hintStyle}>Z katastru nemovitostí</div>
        </div>
        <div>
          <label className="form-label">Vlastní označení</label>
          <input value={form.ownDesignation} onChange={(e) => set('ownDesignation', e.target.value)} placeholder="např. B204" maxLength={100} style={inputStyle()} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="form-label">Typ prostoru</label>
          <select value={form.spaceType} onChange={(e) => set('spaceType', e.target.value)} style={inputStyle()}>
            {SPACE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Dispozice</label>
          <input value={form.disposition} onChange={(e) => set('disposition', e.target.value)} placeholder="2+kk" maxLength={20} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Patro</label>
          <input type="number" value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="1" style={inputStyle()} />
        </div>
      </div>

      {/* ── Plochy a rozúčtování ─────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16 }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>Plochy a rozúčtování</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
          <div>
            <label className="form-label">Podlahová plocha (m²)</label>
            <input type="number" step="0.01" min="0" value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="65" style={inputStyle()} />
          </div>
          <div>
            <label className="form-label">Vytápěná plocha (m²)</label>
            <input type="number" step="0.01" min="0" value={form.heatingArea} onChange={(e) => set('heatingArea', e.target.value)} style={inputStyle()} />
            <div style={hintStyle}>Pokud se liší od podlahové — pro rozúčtování tepla</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Podíl na spol. částech (%)</label>
            <input type="number" step="0.0001" min="0" max="100" value={form.commonAreaShare} onChange={(e) => set('commonAreaShare', e.target.value)} placeholder="3.4567" style={inputStyle('commonAreaShare')} />
            {errors.commonAreaShare && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.commonAreaShare}</div>}
            <div style={hintStyle}>Z prohlášení vlastníka nebo katastru</div>
          </div>
          <div>
            <label className="form-label">Počet osob</label>
            <input type="number" min="0" step="1" value={form.personCount} onChange={(e) => set('personCount', e.target.value)} placeholder="0" style={inputStyle()} />
            <div style={hintStyle}>Výchozí počet — rozúčtovací klíč</div>
          </div>
        </div>
      </div>

      {/* ── Technické údaje (collapsible) ────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button onClick={() => setShowTech(!showTech)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600, padding: 0, marginBottom: showTech ? 10 : 0 }}>
          Technické údaje {showTech ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showTech && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={form.hasElevator} onChange={(e) => set('hasElevator', e.target.checked)} /> Výtah
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label className="form-label">Způsob vytápění</label>
                <input value={form.heatingMethod} onChange={(e) => set('heatingMethod', e.target.value)} placeholder="ústřední, etážové..." style={inputStyle()} />
              </div>
              <div>
                <label className="form-label">Koeficient vytápění</label>
                <input type="number" step="0.01" min="0" value={form.heatingCoefficient} onChange={(e) => set('heatingCoefficient', e.target.value)} style={inputStyle()} />
                <div style={hintStyle}>Standardní = 1.0</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Plocha TUV (m²)</label>
                <input type="number" step="0.01" min="0" value={form.tuvArea} onChange={(e) => set('tuvArea', e.target.value)} style={inputStyle()} />
                <div style={hintStyle}>Pro rozúčtování teplé vody</div>
              </div>
              <div>
                <label className="form-label">Symbol pro rozúčtovatele</label>
                <input value={form.extAllocatorRef} onChange={(e) => set('extAllocatorRef', e.target.value)} maxLength={50} style={inputStyle()} />
                <div style={hintStyle}>Jen při externím rozúčtovateli</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Platnost (collapsible) ───────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 12 }}>
        <button onClick={() => setShowValidity(!showValidity)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600, padding: 0, marginBottom: showValidity ? 10 : 0 }}>
          Platnost {showValidity ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showValidity && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
              <div>
                <label className="form-label">Platnost od</label>
                <input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} style={inputStyle()} />
              </div>
              <div>
                <label className="form-label">Platnost do</label>
                <input type="date" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} style={inputStyle()} />
              </div>
            </div>
            {form.validTo && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '6px 10px', fontSize: '0.8rem', color: '#b45309' }}>
                Jednotka bude označena jako vyřazená.
              </div>
            )}
          </div>
        )}
      </div>

      {(errors.submit || mutation.isError) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>
          {errors.submit || 'Nepodařilo se uložit jednotku'}
        </div>
      )}
    </Modal>
  );
}
