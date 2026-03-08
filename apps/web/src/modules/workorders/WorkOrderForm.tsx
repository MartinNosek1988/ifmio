import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useWorkOrderStore } from './workorder-store';
import { loadFromStorage } from '../../core/storage';
import { WO_PRIORITY_LABELS } from '../../constants/labels';

type R = Record<string, unknown>;

interface Props {
  onClose: () => void;
}

export default function WorkOrderForm({ onClose }: Props) {
  const { create } = useWorkOrderStore();
  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);

  const [form, setForm] = useState({
    nazev: '',
    popis: '',
    priorita: 'normalni' as const,
    propId: '',
    jednotkaId: '',
    resitel: '',
    zadavatel: '',
    terminDo: '',
    odhadovanaHodiny: '',
    naklady: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  const availableUnits = units.filter(u => form.propId && String(u.property_id) === form.propId);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nazev.trim()) errs.nazev = 'Nazev je povinny';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    create({
      nazev: form.nazev,
      popis: form.popis || undefined,
      priorita: form.priorita,
      stav: 'nova',
      propId: form.propId || undefined,
      jednotkaId: form.jednotkaId || undefined,
      resitel: form.resitel || undefined,
      zadavatel: form.zadavatel || undefined,
      datumVytvoreni: new Date().toISOString().slice(0, 10),
      terminDo: form.terminDo || undefined,
      odhadovanaHodiny: form.odhadovanaHodiny ? Number(form.odhadovanaHodiny) : undefined,
      naklady: form.naklady ? Number(form.naklady) : undefined,
    });
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Novy Work Order"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit}>Vytvorit</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nazev *</label>
        <input value={form.nazev} onChange={e => set('nazev', e.target.value)} style={inputStyle('nazev')} placeholder="Strucny popis prace" />
        {errors.nazev && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.nazev}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Priorita</label>
          <select value={form.priorita} onChange={e => set('priorita', e.target.value)} style={inputStyle()}>
            {Object.entries(WO_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Termin</label>
          <input type="date" value={form.terminDo} onChange={e => set('terminDo', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nemovitost</label>
        <select value={form.propId} onChange={e => { set('propId', e.target.value); set('jednotkaId', ''); }} style={inputStyle()}>
          <option value="">-- Vyber nemovitost --</option>
          {properties.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.nazev || p.name)}</option>)}
        </select>
      </div>

      {availableUnits.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Jednotka</label>
          <select value={form.jednotkaId} onChange={e => set('jednotkaId', e.target.value)} style={inputStyle()}>
            <option value="">-- Bez jednotky --</option>
            {availableUnits.map(u => (
              <option key={String(u.id)} value={String(u.id)}>
                {String(u.cislo)} · {String(u.typ || u.type)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Resitel</label>
          <input value={form.resitel} onChange={e => set('resitel', e.target.value)} style={inputStyle()} placeholder="Jmeno resitele" />
        </div>
        <div>
          <label className="form-label">Zadavatel</label>
          <input value={form.zadavatel} onChange={e => set('zadavatel', e.target.value)} style={inputStyle()} placeholder="Jmeno zadavatele" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Odhad (hodiny)</label>
          <input type="number" min="0" value={form.odhadovanaHodiny} onChange={e => set('odhadovanaHodiny', e.target.value)} style={inputStyle()} placeholder="0" />
        </div>
        <div>
          <label className="form-label">Naklady (Kc)</label>
          <input type="number" min="0" value={form.naklady} onChange={e => set('naklady', e.target.value)} style={inputStyle()} placeholder="0" />
        </div>
      </div>

      <div>
        <label className="form-label">Popis</label>
        <textarea value={form.popis} onChange={e => set('popis', e.target.value)}
          rows={3} style={{ ...inputStyle(), resize: 'vertical' as const }} placeholder="Podrobny popis prace..." />
      </div>
    </Modal>
  );
}
