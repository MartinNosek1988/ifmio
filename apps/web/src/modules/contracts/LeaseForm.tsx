import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useContractsStore, type LeaseAgreement } from './contracts-store';
import { loadFromStorage } from '../../core/storage';

type R = Record<string, unknown>;

interface Props {
  lease?: LeaseAgreement;
  onClose: () => void;
}

export default function LeaseForm({ lease, onClose }: Props) {
  const { create, update } = useContractsStore();
  const isEdit = !!lease;

  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);
  const residents = loadFromStorage<R[]>('estateos_residents', []);

  const [form, setForm] = useState({
    najemnik: lease?.najemnik || '',
    propId: String(lease?.propId || ''),
    jednotkaId: String(lease?.jednotkaId || ''),
    mesicniNajem: lease?.mesicniNajem?.toString() || '',
    kauce: lease?.kauce?.toString() || '',
    datumOd: lease?.datumOd || new Date().toISOString().slice(0, 10),
    datumDo: lease?.datumDo || '',
    poznamka: lease?.poznamka || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  const availableUnits = units.filter(u => form.propId && String(u.property_id) === form.propId);

  const handleUnitChange = (unitId: string) => {
    const u = units.find(x => String(x.id) === unitId);
    setForm(f => ({
      ...f,
      jednotkaId: unitId,
      mesicniNajem: f.mesicniNajem || String(u?.rent || u?.najemne || ''),
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.najemnik.trim()) errs.najemnik = 'Najemnik je povinny';
    if (!form.propId) errs.propId = 'Vyberte nemovitost';
    if (!form.jednotkaId) errs.jednotkaId = 'Vyberte jednotku';
    if (!form.mesicniNajem || isNaN(Number(form.mesicniNajem))) errs.mesicniNajem = 'Zadejte castku';
    if (!form.datumOd) errs.datumOd = 'Datum od je povinne';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      najemnik: form.najemnik,
      propId: form.propId,
      jednotkaId: form.jednotkaId,
      mesicniNajem: Number(form.mesicniNajem),
      kauce: form.kauce ? Number(form.kauce) : undefined,
      datumOd: form.datumOd,
      datumDo: form.datumDo || undefined,
      poznamka: form.poznamka || undefined,
    };
    if (isEdit) {
      update(lease!.id, data);
    } else {
      create({ ...data, status: 'aktivni' });
    }
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit smlouvu' : 'Nova najemni smlouva'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit}>{isEdit ? 'Ulozit' : 'Vytvorit'}</Button>
        </div>
      }>

      {/* Tenant */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Najemnik *</label>
        <input value={form.najemnik} onChange={e => set('najemnik', e.target.value)}
          style={inputStyle('najemnik')} placeholder="Jmeno najemnika" list="residents-datalist" />
        <datalist id="residents-datalist">
          {residents.map(r => <option key={String(r.id)} value={String(r.jmeno)} />)}
        </datalist>
        {errors.najemnik && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.najemnik}</div>}
      </div>

      {/* Property */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nemovitost *</label>
        <select value={form.propId} onChange={e => { set('propId', e.target.value); set('jednotkaId', ''); }} style={inputStyle('propId')}>
          <option value="">-- Vyber nemovitost --</option>
          {properties.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.nazev || p.name)}</option>)}
        </select>
        {errors.propId && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.propId}</div>}
      </div>

      {/* Unit */}
      {form.propId && (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Jednotka *</label>
          <select value={form.jednotkaId} onChange={e => handleUnitChange(e.target.value)} style={inputStyle('jednotkaId')}>
            <option value="">-- Vyber jednotku --</option>
            {availableUnits.map(u => (
              <option key={String(u.id)} value={String(u.id)}>
                c. {String(u.cislo)} · {String(u.typ || u.type)} · {String(u.plocha || u.podlahova_plocha || '')} m2
              </option>
            ))}
          </select>
          {errors.jednotkaId && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.jednotkaId}</div>}
        </div>
      )}

      {/* Rent + Deposit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Mesicni najem (Kc) *</label>
          <input type="number" min="0" value={form.mesicniNajem} onChange={e => set('mesicniNajem', e.target.value)} style={inputStyle('mesicniNajem')} />
          {errors.mesicniNajem && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.mesicniNajem}</div>}
        </div>
        <div>
          <label className="form-label">Kauce (Kc)</label>
          <input type="number" min="0" value={form.kauce} onChange={e => set('kauce', e.target.value)}
            style={inputStyle()} placeholder={form.mesicniNajem ? `${Number(form.mesicniNajem) * 2}` : '0'} />
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Platnost od *</label>
          <input type="date" value={form.datumOd} onChange={e => set('datumOd', e.target.value)} style={inputStyle('datumOd')} />
          {errors.datumOd && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.datumOd}</div>}
        </div>
        <div>
          <label className="form-label">Platnost do</label>
          <input type="date" value={form.datumDo} onChange={e => set('datumDo', e.target.value)} style={inputStyle()} />
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>Prazdne = na dobu neurcitou</div>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="form-label">Poznamka</label>
        <textarea value={form.poznamka} onChange={e => set('poznamka', e.target.value)}
          rows={2} style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>
    </Modal>
  );
}
