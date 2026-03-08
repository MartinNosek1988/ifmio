import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { usePropertiesStore } from './properties-store';
import type { Unit, UnitType, UnitStatus } from '../../shared/schema/unit';

interface Props {
  propertyId: string;
  unit?: Unit | null;
  onClose: () => void;
}

export default function UnitForm({ propertyId, unit, onClose }: Props) {
  const { createUnit, updateUnit } = usePropertiesStore();
  const isEdit = !!unit;

  const [form, setForm] = useState({
    cislo: unit?.cislo || '',
    nazev: unit?.nazev || '',
    type: (unit?.type || 'byt') as UnitType,
    status: (unit?.status || 'volna') as UnitStatus,
    podlahova_plocha: unit?.podlahova_plocha || 0,
    disposice: unit?.disposice || '',
    podlazi: unit?.podlazi || 1,
    rent: (unit as unknown as Record<string, unknown>)?.rent as number || 0,
    poznamka: unit?.poznamka || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.cislo.trim()) errs.cislo = 'Číslo jednotky je povinné';
    if (form.podlahova_plocha <= 0) errs.podlahova_plocha = 'Zadejte plochu';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEdit) {
      updateUnit(String(unit!.id), form as Partial<Unit>);
    } else {
      createUnit(propertyId, form as Partial<Unit>);
    }
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)',
    boxSizing: 'border-box' as const,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Upravit jednotku' : 'Nová jednotka'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit}>{isEdit ? 'Uložit' : 'Vytvořit'}</Button>
        </div>
      }
    >
      {/* Číslo + Typ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="form-label">Číslo jednotky *</label>
          <input value={form.cislo} onChange={e => set('cislo', e.target.value)}
            placeholder="1A, 12, G01..." style={inputStyle('cislo')} />
          {errors.cislo && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.cislo}</div>}
        </div>
        <div>
          <label className="form-label">Typ</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle()}>
            <option value="byt">Byt</option>
            <option value="nebyt">Nebytový prostor</option>
            <option value="garaz">Garáž</option>
            <option value="parkovaci">Parkovací stání</option>
            <option value="sklep">Sklep</option>
            <option value="pozemek">Pozemek</option>
          </select>
        </div>
      </div>

      {/* Plocha + Dispozice */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="form-label">Plocha (m²) *</label>
          <input type="number" value={form.podlahova_plocha}
            onChange={e => set('podlahova_plocha', parseFloat(e.target.value) || 0)}
            style={inputStyle('podlahova_plocha')} />
          {errors.podlahova_plocha && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.podlahova_plocha}</div>}
        </div>
        <div>
          <label className="form-label">Dispozice</label>
          <input value={form.disposice} onChange={e => set('disposice', e.target.value)}
            placeholder="2+kk, 3+1..." list="disposice-list" style={inputStyle()} />
          <datalist id="disposice-list">
            {['1+kk','1+1','2+kk','2+1','3+kk','3+1','4+kk','4+1','5+kk'].map(d =>
              <option key={d} value={d} />
            )}
          </datalist>
        </div>
      </div>

      {/* Status + Podlaží */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="form-label">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle()}>
            <option value="volna">Volná</option>
            <option value="obsazena">Obsazená</option>
            <option value="rezervovana">Rezervovaná</option>
            <option value="neaktivni">Neaktivní</option>
          </select>
        </div>
        <div>
          <label className="form-label">Podlaží</label>
          <input type="number" value={form.podlazi}
            onChange={e => set('podlazi', parseInt(e.target.value) || 0)} style={inputStyle()} />
        </div>
      </div>

      {/* Nájemné */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Nájemné / měsíc (Kč)</label>
        <input type="number" value={form.rent}
          onChange={e => set('rent', parseFloat(e.target.value) || 0)} style={inputStyle()} />
      </div>

      {/* Poznámka */}
      <div>
        <label className="form-label">Poznámka</label>
        <textarea value={form.poznamka} onChange={e => set('poznamka', e.target.value)}
          rows={2} style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>
    </Modal>
  );
}
