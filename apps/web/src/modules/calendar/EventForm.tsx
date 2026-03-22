import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { EVENT_TYPE_LABELS } from '../../constants/labels';
import { useCreateCalendarEvent, useUpdateCalendarEvent } from './api/calendar.queries';
import type { ApiCalendarEvent } from './api/calendar.api';
import { propertiesApi } from '../properties/properties-api';

const TYPY = ['schuze', 'revize', 'udrzba', 'predani', 'prohlidka', 'ostatni'] as const;

interface Props {
  event?: ApiCalendarEvent;
  defaultDate?: string;
  onClose: () => void;
}

export default function EventForm({ event, defaultDate, onClose }: Props) {
  const createMutation = useCreateCalendarEvent();
  const updateMutation = useUpdateCalendarEvent();
  const isEdit = !!event;

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  });

  const [form, setForm] = useState({
    title: event?.title || '',
    eventType: event?.eventType || 'ostatni',
    date: event?.date || defaultDate || new Date().toISOString().slice(0, 10),
    timeFrom: event?.timeFrom || '',
    timeTo: event?.timeTo || '',
    propertyId: event?.propertyId || '',
    location: event?.location || '',
    description: event?.description || '',
    attendees: event?.attendees?.join(', ') || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Název je povinný';
    if (!form.date) errs.date = 'Datum je povinné';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const attendees = form.attendees.split(',').map(u => u.trim()).filter(Boolean);
    const dto = {
      title: form.title,
      eventType: form.eventType,
      date: form.date,
      timeFrom: form.timeFrom || undefined,
      timeTo: form.timeTo || undefined,
      propertyId: form.propertyId || undefined,
      location: form.location || undefined,
      description: form.description || undefined,
      attendees: attendees.length ? attendees : undefined,
    };
    if (isEdit) {
      updateMutation.mutate({ id: event!.id, dto }, { onSuccess: () => onClose() });
    } else {
      createMutation.mutate(dto, { onSuccess: () => onClose() });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit událost' : 'Nová událost'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} data-testid="calendar-form-cancel">Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending} data-testid="calendar-form-save">{isEdit ? 'Uložit' : 'Vytvořit'}</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název události *</label>
        <input data-testid="calendar-form-title" value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle('title')} placeholder="Schůze SVJ, Revize výtahu..." />
        {errors.title && <div data-testid="calendar-form-error-title" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.title}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Typ</label>
          <select value={form.eventType} onChange={e => set('eventType', e.target.value)} style={inputStyle()}>
            {TYPY.map(t => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Nemovitost</label>
          <select value={form.propertyId} onChange={e => set('propertyId', e.target.value)} style={inputStyle()}>
            <option value="">-- Obecná --</option>
            {(properties ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Datum *</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle('date')} />
          {errors.date && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.date}</div>}
        </div>
        <div>
          <label className="form-label">Čas od</label>
          <input type="time" value={form.timeFrom} onChange={e => set('timeFrom', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Čas do</label>
          <input type="time" value={form.timeTo} onChange={e => set('timeTo', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Místo</label>
        <input value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle()} placeholder="Společenská místnost, Online..." />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={2} style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>

      <div>
        <label className="form-label">Účastníci (oddělte čárkou)</label>
        <input value={form.attendees} onChange={e => set('attendees', e.target.value)}
          placeholder="Jan Novák, Marie Králová..." style={inputStyle()} />
      </div>
    </Modal>
  );
}
