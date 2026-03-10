import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useCreateTicket } from './api/helpdesk.queries';
import { useProperties } from '../properties/use-properties';
import type { ApiProperty } from '../properties/properties-api';

const CATEGORIES = [
  { value: 'general', label: 'Obecné' },
  { value: 'plumbing', label: 'Vodovod a kanalizace' },
  { value: 'electrical', label: 'Elektroinstalace' },
  { value: 'hvac', label: 'Vytápění / VZT' },
  { value: 'structural', label: 'Stavební práce' },
  { value: 'cleaning', label: 'Úklid' },
  { value: 'other', label: 'Ostatní' },
];

const PRIORITIES = [
  { value: 'low', label: 'Nízká' },
  { value: 'medium', label: 'Normální' },
  { value: 'high', label: 'Vysoká' },
  { value: 'urgent', label: 'Urgentní' },
];

interface Props {
  onClose: () => void;
}

export default function TicketForm({ onClose }: Props) {
  const createMutation = useCreateTicket();
  const { data: properties = [] } = useProperties();

  const [form, setForm] = useState({
    title: '',
    description: '',
    propertyId: '',
    unitId: '',
    priority: 'medium',
    category: 'general',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const selectedProperty = (properties as ApiProperty[]).find((p) => p.id === form.propertyId);
  const availableUnits = selectedProperty?.units ?? [];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Název je povinný';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        priority: form.priority,
        propertyId: form.propertyId || undefined,
        unitId: form.unitId || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  const inputStyle = (field?: string) => ({
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)',
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Nový tiket"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Vytvářím...' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název *</label>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Stručný popis problému"
          style={inputStyle('title')}
        />
        {errors.title && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.title}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Nemovitost</label>
          <select
            value={form.propertyId}
            onChange={(e) => { set('propertyId', e.target.value); set('unitId', ''); }}
            style={inputStyle()}
          >
            <option value="">— vyberte —</option>
            {(properties as ApiProperty[]).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {availableUnits.length > 0 && (
          <div>
            <label className="form-label">Jednotka</label>
            <select value={form.unitId} onChange={(e) => set('unitId', e.target.value)} style={inputStyle()}>
              <option value="">— bez jednotky —</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Kategorie</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} style={inputStyle()}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Priorita</label>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)} style={inputStyle()}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">Popis</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          placeholder="Detailní popis problému, umístění, okolnosti..."
          style={{ ...inputStyle(), resize: 'vertical' as const }}
        />
      </div>

      {createMutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>
          Nepodařilo se vytvořit tiket.
        </div>
      )}
    </Modal>
  );
}
