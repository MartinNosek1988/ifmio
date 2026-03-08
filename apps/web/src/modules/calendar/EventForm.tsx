import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useCalendarStore, type CalendarEvent, type EventTyp } from './calendar-store';
import { loadFromStorage } from '../../core/storage';
import { EVENT_TYPE_LABELS } from '../../constants/labels';

type R = Record<string, unknown>;

const TYPY: EventTyp[] = ['schuze', 'revize', 'udrzba', 'predani', 'prohlidka', 'ostatni'];

interface Props {
  event?: CalendarEvent;
  defaultDatum?: string;
  onClose: () => void;
}

export default function EventForm({ event, defaultDatum, onClose }: Props) {
  const { create, update } = useCalendarStore();
  const isEdit = !!event;
  const properties = loadFromStorage<R[]>('estateos_properties', []);

  const [form, setForm] = useState({
    nazev: event?.nazev || '',
    typ: event?.typ || ('ostatni' as EventTyp),
    datum: event?.datum || defaultDatum || new Date().toISOString().slice(0, 10),
    cas: event?.cas || '',
    casDo: event?.casDo || '',
    propId: String(event?.propId || ''),
    misto: event?.misto || '',
    popis: event?.popis || '',
    ucastnici: event?.ucastnici?.join(', ') || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nazev.trim()) errs.nazev = 'Nazev je povinny';
    if (!form.datum) errs.datum = 'Datum je povinne';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const ucastnici = form.ucastnici.split(',').map(u => u.trim()).filter(Boolean);
    const data = {
      nazev: form.nazev,
      typ: form.typ,
      datum: form.datum,
      cas: form.cas || undefined,
      casDo: form.casDo || undefined,
      propId: form.propId || undefined,
      misto: form.misto || undefined,
      popis: form.popis || undefined,
      ucastnici: ucastnici.length ? ucastnici : undefined,
    };
    if (isEdit) update(event!.id, data);
    else create(data);
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit udalost' : 'Nova udalost'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit}>{isEdit ? 'Ulozit' : 'Vytvorit'}</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nazev udalosti *</label>
        <input value={form.nazev} onChange={e => set('nazev', e.target.value)} style={inputStyle('nazev')} placeholder="Schuze SVJ, Revize vytahu..." />
        {errors.nazev && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.nazev}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Typ</label>
          <select value={form.typ} onChange={e => set('typ', e.target.value)} style={inputStyle()}>
            {TYPY.map(t => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Nemovitost</label>
          <select value={form.propId} onChange={e => set('propId', e.target.value)} style={inputStyle()}>
            <option value="">-- Obecna --</option>
            {properties.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.nazev || p.name)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Datum *</label>
          <input type="date" value={form.datum} onChange={e => set('datum', e.target.value)} style={inputStyle('datum')} />
          {errors.datum && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.datum}</div>}
        </div>
        <div>
          <label className="form-label">Cas od</label>
          <input type="time" value={form.cas} onChange={e => set('cas', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Cas do</label>
          <input type="time" value={form.casDo} onChange={e => set('casDo', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Misto</label>
        <input value={form.misto} onChange={e => set('misto', e.target.value)} style={inputStyle()} placeholder="Spolecenska mistnost, Online..." />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis</label>
        <textarea value={form.popis} onChange={e => set('popis', e.target.value)}
          rows={2} style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>

      <div>
        <label className="form-label">Ucastnici (oddelte carkou)</label>
        <input value={form.ucastnici} onChange={e => set('ucastnici', e.target.value)}
          placeholder="Jan Novak, Marie Kralova..." style={inputStyle()} />
      </div>
    </Modal>
  );
}
