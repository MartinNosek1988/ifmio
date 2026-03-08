import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useHelpdeskStore } from './helpdesk-store';
import { loadFromStorage } from '../../core/storage';
import { TICKET_PRIORITY_LABELS } from '../../constants/labels';
import type { TicketPriority } from '../../shared/schema/ticket';

type R = Record<string, unknown>;

const CATEGORIES = [
  'Vytapeni', 'Vodovod a kanalizace', 'Elektroinstalace',
  'Stavebni prace', 'Bezpecnost', 'Uklid', 'Ostatni',
];

interface Props {
  onClose: () => void;
}

export default function TicketForm({ onClose }: Props) {
  const { create } = useHelpdeskStore();
  const properties = loadFromStorage<R[]>('estateos_properties', []);
  const units = loadFromStorage<R[]>('estateos_units', []);

  const [form, setForm] = useState({
    title: '',
    description: '',
    property_id: '',
    unit_id: '',
    priority: 'medium' as TicketPriority,
    kategorie: '',
    zadavatel: '',
    due_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  const availableUnits = units.filter(u => form.property_id && String(u.property_id) === form.property_id);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Název je povinný';
    if (!form.property_id) errs.property_id = 'Nemovitost je povinná';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const nextNum = 36000 + Math.floor(Math.random() * 10000);
    create({
      ...form,
      cisloProtokolu: `HD-${nextNum}`,
    } as Parameters<typeof create>[0]);
    onClose();
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Nový tiket"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit}>Vytvořit</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle('title')} />
        {errors.title && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.title}</div>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nemovitost *</label>
        <select value={form.property_id} onChange={e => { set('property_id', e.target.value); set('unit_id', ''); }} style={inputStyle('property_id')}>
          <option value="">-- Vyber nemovitost --</option>
          {properties.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.nazev || p.name)}</option>)}
        </select>
        {errors.property_id && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.property_id}</div>}
      </div>

      {availableUnits.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Jednotka</label>
          <select value={form.unit_id} onChange={e => set('unit_id', e.target.value)} style={inputStyle()}>
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
          <label className="form-label">Kategorie</label>
          <select value={form.kategorie} onChange={e => set('kategorie', e.target.value)} style={inputStyle()}>
            <option value="">-- Kategorie --</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Priorita</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)} style={inputStyle()}>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Zadavatel</label>
          <input value={form.zadavatel} onChange={e => set('zadavatel', e.target.value)} style={inputStyle()} placeholder="Jméno zadavatele" />
        </div>
        <div>
          <label className="form-label">Termín</label>
          <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div>
        <label className="form-label">Popis</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>
    </Modal>
  );
}
