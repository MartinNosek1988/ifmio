import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useMeterStore } from './meter-store';
import { loadFromStorage } from '../../core/storage';
import { METER_TYPE_LABELS } from '../../constants/labels';

type R = Record<string, unknown>;

const JEDNOTKY: Record<string, string> = {
  elektrina: 'kWh', voda_studena: 'm3', voda_tepla: 'm3',
  plyn: 'm3', teplo: 'GJ',
};

interface Props {
  onClose: () => void;
}

export default function MeterForm({ onClose }: Props) {
  const { createMeter } = useMeterStore();
  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);

  const [form, setForm] = useState({
    nazev: '',
    cislo: '',
    typ: 'elektrina',
    jednotka: 'kWh',
    propId: '',
    jednotkaId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  const availableUnits = units.filter(u => form.propId && String(u.property_id) === form.propId);

  const handleTypChange = (typ: string) => {
    setForm(f => ({ ...f, typ, jednotka: JEDNOTKY[typ] || f.jednotka }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nazev.trim()) errs.nazev = 'Nazev je povinny';
    if (!form.cislo.trim()) errs.cislo = 'Cislo je povinne';
    if (!form.propId) errs.propId = 'Vyberte nemovitost';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMeter({
      nazev: form.nazev,
      cislo: form.cislo,
      typ: form.typ,
      jednotka: form.jednotka,
      propId: form.propId,
      jednotkaId: form.jednotkaId || undefined,
    });
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Nove meridlo"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit}>Vytvorit</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nazev meridla *</label>
        <input value={form.nazev} onChange={e => set('nazev', e.target.value)} style={inputStyle('nazev')} placeholder="napr. Hlavni elektromер" />
        {errors.nazev && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.nazev}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Cislo meridla *</label>
          <input value={form.cislo} onChange={e => set('cislo', e.target.value)} style={inputStyle('cislo')} placeholder="SN-12345" />
          {errors.cislo && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.cislo}</div>}
        </div>
        <div>
          <label className="form-label">Typ</label>
          <select value={form.typ} onChange={e => handleTypChange(e.target.value)} style={inputStyle()}>
            {Object.entries(METER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Jednotka</label>
        <input value={form.jednotka} onChange={e => set('jednotka', e.target.value)} style={inputStyle()} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nemovitost *</label>
        <select value={form.propId} onChange={e => { set('propId', e.target.value); set('jednotkaId', ''); }} style={inputStyle('propId')}>
          <option value="">-- Vyber nemovitost --</option>
          {properties.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.nazev || p.name)}</option>)}
        </select>
        {errors.propId && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.propId}</div>}
      </div>

      {availableUnits.length > 0 && (
        <div>
          <label className="form-label">Jednotka (byt)</label>
          <select value={form.jednotkaId} onChange={e => set('jednotkaId', e.target.value)} style={inputStyle()}>
            <option value="">-- Spolecne --</option>
            {availableUnits.map(u => (
              <option key={String(u.id)} value={String(u.id)}>c. {String(u.cislo)} · {String(u.typ || u.type)}</option>
            ))}
          </select>
        </div>
      )}
    </Modal>
  );
}
