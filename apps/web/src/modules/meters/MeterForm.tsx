import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { useCreateMeter } from './api/meters.queries';
import { METER_TYPE_LABELS } from '../../constants/labels';
import { propertiesApi } from '../properties/properties-api';

const JEDNOTKY: Record<string, string> = {
  elektrina: 'kWh', voda_studena: 'm³', voda_tepla: 'm³',
  plyn: 'm³', teplo: 'GJ',
};

interface Props {
  onClose: () => void;
}

export default function MeterForm({ onClose }: Props) {
  const createMutation = useCreateMeter();

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  });

  const [form, setForm] = useState({
    name: '',
    serialNumber: '',
    meterType: 'elektrina',
    unit: 'kWh',
    propertyId: '',
    unitId: '',
    installDate: new Date().toISOString().slice(0, 10),
    calibrationDue: '',
    manufacturer: '',
    location: '',
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const selectedProp = properties?.find(p => p.id === form.propertyId);
  const availableUnits = useMemo(() => selectedProp?.units ?? [], [selectedProp]);

  const handleTypeChange = (typ: string) => {
    setForm(f => ({ ...f, meterType: typ, unit: JEDNOTKY[typ] || f.unit }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Název je povinný';
    if (!form.serialNumber.trim()) errs.serialNumber = 'Číslo je povinné';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      name: form.name,
      serialNumber: form.serialNumber,
      meterType: form.meterType,
      unit: form.unit,
      propertyId: form.propertyId || undefined,
      unitId: form.unitId || undefined,
      installDate: form.installDate || undefined,
      calibrationDue: form.calibrationDue || undefined,
      manufacturer: form.manufacturer || undefined,
      location: form.location || undefined,
      note: form.note || undefined,
    }, { onSuccess: () => onClose() });
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Nové měřidlo"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>Vytvořit</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název měřidla *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle('name')} placeholder="např. Hlavní elektroměr" />
        {errors.name && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Výrobní číslo *</label>
          <input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} style={inputStyle('serialNumber')} placeholder="SN-12345" />
          {errors.serialNumber && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.serialNumber}</div>}
        </div>
        <div>
          <label className="form-label">Typ</label>
          <select value={form.meterType} onChange={e => handleTypeChange(e.target.value)} style={inputStyle()}>
            {Object.entries(METER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Jednotka</label>
          <input value={form.unit} onChange={e => set('unit', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Výrobce</label>
          <input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} style={inputStyle()} placeholder="např. Landis+Gyr" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Nemovitost</label>
          <select value={form.propertyId} onChange={e => { set('propertyId', e.target.value); set('unitId', ''); }} style={inputStyle()}>
            <option value="">-- Výběr nemovitost --</option>
            {(properties ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Jednotka (byt)</label>
          <select value={form.unitId} onChange={e => set('unitId', e.target.value)}
            disabled={!form.propertyId || availableUnits.length === 0} style={inputStyle()}>
            <option value="">-- Společné --</option>
            {availableUnits.map(u => <option key={u.id} value={u.id}>{u.name}{u.area ? ` · ${u.area} m²` : ''}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Datum instalace</label>
          <input type="date" value={form.installDate} onChange={e => set('installDate', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Kalibrace do</label>
          <input type="date" value={form.calibrationDue} onChange={e => set('calibrationDue', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Umístění</label>
        <input value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle()} placeholder="např. Sklep - rozvaděč č.1" />
      </div>

      <div>
        <label className="form-label">Poznámka</label>
        <textarea value={form.note} onChange={e => set('note', e.target.value)}
          rows={2} style={{ ...inputStyle(), resize: 'vertical' as const }} placeholder="Volitelná poznámka..." />
      </div>
    </Modal>
  );
}
