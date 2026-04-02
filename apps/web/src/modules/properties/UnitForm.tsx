import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../shared/components';
import { FormSection, FormFooter } from '../../shared/components/FormSection';
import { FormField } from '../../shared/components/FormField';
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
    hotWaterCoefficient: unit?.hotWaterCoefficient != null ? String(unit.hotWaterCoefficient) : '1.0',
    tuvArea: unit?.tuvArea != null ? String(unit.tuvArea) : '',
    extAllocatorRef: unit?.extAllocatorRef ?? '',
    validFrom: unit?.validFrom ? unit.validFrom.slice(0, 10) : '',
    validTo: unit?.validTo ? unit.validTo.slice(0, 10) : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
        commonAreaShare: share != null && !isNaN(share) ? share / 100 : null,
        personCount: form.personCount ? parseInt(form.personCount) : null,
        hasElevator: form.hasElevator || null,
        heatingMethod: form.heatingMethod || null,
        heatingCoefficient: form.heatingCoefficient ? parseFloat(form.heatingCoefficient) : null,
        hotWaterCoefficient: form.hotWaterCoefficient ? parseFloat(form.hotWaterCoefficient) : null,
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

  // Show residential-specific fields
  const isResidential = ['RESIDENTIAL', 'NON_RESIDENTIAL'].includes(form.spaceType);

  return (
    <Modal
      open onClose={onClose}
      title={isEdit ? `Upravit — ${unit!.name}` : 'Nová jednotka'}
      footer={<FormFooter onCancel={onClose} onSubmit={handleSubmit} isSubmitting={mutation.isPending} submitLabel={isEdit ? 'Uložit' : 'Vytvořit'} />}
    >
      {/* ── Sekce 1: Identifikace (vždy otevřená) ─────────────── */}
      <FormSection title="Identifikace" collapsible={false}>
        <FormField label="Název jednotky" name="name" error={errors.name}>
          <input data-testid="unit-form-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Byt 1, Garáž G1..." style={inputStyle('name')} />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="KN označení" name="knDesignation" required={false} helpText="Z katastru nemovitostí">
            <input data-testid="unit-form-knDesignation" value={form.knDesignation} onChange={(e) => set('knDesignation', e.target.value)} placeholder="např. 123/45" maxLength={30} style={inputStyle()} />
          </FormField>
          <FormField label="Vlastní označení" name="ownDesignation" required={false}>
            <input value={form.ownDesignation} onChange={(e) => set('ownDesignation', e.target.value)} placeholder="např. B204" maxLength={100} style={inputStyle()} />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FormField label="Typ prostoru" name="spaceType">
            <select data-testid="unit-form-spaceType" value={form.spaceType} onChange={(e) => set('spaceType', e.target.value)} style={inputStyle()}>
              {SPACE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          {isResidential && (
            <FormField label="Dispozice" name="disposition" required={false}>
              <input value={form.disposition} onChange={(e) => set('disposition', e.target.value)} placeholder="2+kk" maxLength={20} style={inputStyle()} />
            </FormField>
          )}
          <FormField label="Patro" name="floor" required={false}>
            <input type="number" data-testid="unit-form-floor" value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="1" style={inputStyle()} />
          </FormField>
        </div>
      </FormSection>

      {/* ── Sekce 2: Plochy a rozúčtování ─────────────────────── */}
      <FormSection title="Plochy a rozúčtování">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Podlahová plocha (m²)" name="area" required={false}>
            <input type="number" step="0.01" min="0" data-testid="unit-form-area" value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="65" style={inputStyle()} />
          </FormField>
          <FormField label="Vytápěná plocha (m²)" name="heatingArea" required={false} helpText="Pokud se liší od podlahové — pro rozúčtování tepla">
            <input type="number" step="0.01" min="0" value={form.heatingArea} onChange={(e) => set('heatingArea', e.target.value)} style={inputStyle()} />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Podíl na spol. částech (%)" name="commonAreaShare" error={errors.commonAreaShare} required={false} helpText="Z prohlášení vlastníka nebo katastru">
            <input data-testid="unit-form-commonAreaShare" type="number" step="0.0001" min="0" max="100" value={form.commonAreaShare} onChange={(e) => set('commonAreaShare', e.target.value)} placeholder="3.4567" style={inputStyle('commonAreaShare')} />
          </FormField>
          <FormField label="Počet osob" name="personCount" required={false} helpText="Výchozí počet — rozúčtovací klíč">
            <input type="number" min="0" step="1" value={form.personCount} onChange={(e) => set('personCount', e.target.value)} placeholder="0" style={inputStyle()} />
          </FormField>
        </div>
      </FormSection>

      {/* ── Sekce 3: Technické údaje (collapsed) ──────────────── */}
      <FormSection title="Technické údaje" defaultExpanded={false}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', marginBottom: 10 }}>
          <input type="checkbox" checked={form.hasElevator} onChange={(e) => set('hasElevator', e.target.checked)} /> Výtah
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Způsob vytápění" name="heatingMethod" required={false}>
            <input value={form.heatingMethod} onChange={(e) => set('heatingMethod', e.target.value)} placeholder="ústřední, etážové..." style={inputStyle()} />
          </FormField>
          <FormField label="Koeficient vytápění" name="heatingCoefficient" required={false} helpText="Standardní = 1.0">
            <input type="number" step="0.01" min="0" value={form.heatingCoefficient} onChange={(e) => set('heatingCoefficient', e.target.value)} style={inputStyle()} />
          </FormField>
        </div>
        <FormField label="Koeficient TUV" name="hotWaterCoefficient" required={false} helpText="Standardní = 1.0">
          <input type="number" step="0.01" min="0" value={form.hotWaterCoefficient} onChange={(e) => set('hotWaterCoefficient', e.target.value)} style={inputStyle()} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Plocha TUV (m²)" name="tuvArea" required={false} helpText="Pro rozúčtování teplé vody">
            <input type="number" step="0.01" min="0" value={form.tuvArea} onChange={(e) => set('tuvArea', e.target.value)} style={inputStyle()} />
          </FormField>
          <FormField label="Symbol pro rozúčtovatele" name="extAllocatorRef" required={false} helpText="Jen při externím rozúčtovateli">
            <input value={form.extAllocatorRef} onChange={(e) => set('extAllocatorRef', e.target.value)} maxLength={50} style={inputStyle()} />
          </FormField>
        </div>
      </FormSection>

      {/* ── Sekce 4: Platnost (collapsed) ─────────────────────── */}
      <FormSection title="Platnost" defaultExpanded={!!unit?.validFrom}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Platnost od" name="validFrom" required={false}>
            <input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} style={inputStyle()} />
          </FormField>
          <FormField label="Platnost do" name="validTo" required={false}>
            <input type="date" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} style={inputStyle()} />
          </FormField>
        </div>
        {form.validTo && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '6px 10px', fontSize: '0.8rem', color: '#b45309', marginTop: 8 }}>
            Jednotka bude označena jako vyřazená.
          </div>
        )}
      </FormSection>

      {(errors.submit || mutation.isError) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>
          {errors.submit || 'Nepodařilo se uložit jednotku'}
        </div>
      )}
    </Modal>
  );
}
