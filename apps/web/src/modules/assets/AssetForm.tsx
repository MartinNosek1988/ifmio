import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useAssetStore, type AssetStav, type AssetStavRevize } from './asset-store';
import { loadFromStorage } from '../../core/storage';
import { ASSET_STATUS_LABELS, REVISION_STATUS_LABELS } from '../../constants/labels';

type R = Record<string, unknown>;

interface Props {
  onClose: () => void;
}

export default function AssetForm({ onClose }: Props) {
  const { create } = useAssetStore();
  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);

  const [form, setForm] = useState({
    nazev: '',
    typNazev: '',
    vyrobce: '',
    model: '',
    umisteni: '',
    propertyId: '',
    jednotkaId: '',
    stav: 'aktivni' as AssetStav,
    stavRevize: 'ok' as AssetStavRevize,
    datumPorizeni: '',
    pristiRevize: '',
    hodnotaPorizeni: '',
    poznamka: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  const availableUnits = units.filter(u => form.propertyId && String(u.property_id) === form.propertyId);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nazev.trim()) errs.nazev = 'Nazev je povinny';
    if (!form.propertyId) errs.propertyId = 'Vyberte nemovitost';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    create({
      nazev: form.nazev,
      typNazev: form.typNazev || undefined,
      vyrobce: form.vyrobce || undefined,
      model: form.model || undefined,
      umisteni: form.umisteni || undefined,
      propertyId: form.propertyId,
      jednotkaId: form.jednotkaId || undefined,
      stav: form.stav,
      stavRevize: form.stavRevize,
      datumPorizeni: form.datumPorizeni || undefined,
      pristiRevize: form.pristiRevize || undefined,
      hodnotaPorizeni: form.hodnotaPorizeni ? Number(form.hodnotaPorizeni) : undefined,
      poznamka: form.poznamka || undefined,
    });
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Nove zarizeni"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit}>Vytvorit</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nazev zarizeni *</label>
        <input value={form.nazev} onChange={e => set('nazev', e.target.value)} style={inputStyle('nazev')} placeholder="napr. Hlavni kotel" />
        {errors.nazev && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.nazev}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Typ / Kategorie</label>
          <input value={form.typNazev} onChange={e => set('typNazev', e.target.value)} style={inputStyle()} placeholder="napr. Kotel, Vytah" />
        </div>
        <div>
          <label className="form-label">Vyrobce</label>
          <input value={form.vyrobce} onChange={e => set('vyrobce', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Model</label>
          <input value={form.model} onChange={e => set('model', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Umisteni</label>
          <input value={form.umisteni} onChange={e => set('umisteni', e.target.value)} style={inputStyle()} placeholder="napr. Suteren, 2.NP" />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nemovitost *</label>
        <select value={form.propertyId} onChange={e => { set('propertyId', e.target.value); set('jednotkaId', ''); }} style={inputStyle('propertyId')}>
          <option value="">-- Vyber nemovitost --</option>
          {properties.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.nazev || p.name)}</option>)}
        </select>
        {errors.propertyId && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.propertyId}</div>}
      </div>

      {availableUnits.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Jednotka (byt)</label>
          <select value={form.jednotkaId} onChange={e => set('jednotkaId', e.target.value)} style={inputStyle()}>
            <option value="">-- Spolecne --</option>
            {availableUnits.map(u => (
              <option key={String(u.id)} value={String(u.id)}>c. {String(u.cislo)} · {String(u.typ || u.type)}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Stav</label>
          <select value={form.stav} onChange={e => set('stav', e.target.value)} style={inputStyle()}>
            {Object.entries(ASSET_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Stav revize</label>
          <select value={form.stavRevize} onChange={e => set('stavRevize', e.target.value)} style={inputStyle()}>
            {Object.entries(REVISION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Datum porizeni</label>
          <input type="date" value={form.datumPorizeni} onChange={e => set('datumPorizeni', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Pristi revize</label>
          <input type="date" value={form.pristiRevize} onChange={e => set('pristiRevize', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Porizovaci hodnota (Kc)</label>
        <input type="number" value={form.hodnotaPorizeni} onChange={e => set('hodnotaPorizeni', e.target.value)} style={inputStyle()} placeholder="0" />
      </div>

      <div>
        <label className="form-label">Poznamka</label>
        <textarea value={form.poznamka} onChange={e => set('poznamka', e.target.value)} style={{ ...inputStyle(), minHeight: 60 }} />
      </div>
    </Modal>
  );
}
