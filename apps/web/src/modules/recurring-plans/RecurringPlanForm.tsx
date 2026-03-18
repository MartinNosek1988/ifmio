import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { useCreateRecurringPlan, useUpdateRecurringPlan } from './api/recurring-plans.queries';
import type { RecurringPlan } from './api/recurring-plans.api';
import { apiClient } from '../../core/api/client';

interface TenantUser { id: string; name: string; isActive: boolean }

const FREQ_UNITS = [
  { value: 'day', label: 'Denně' },
  { value: 'week', label: 'Týdně' },
  { value: 'month', label: 'Měsíčně' },
  { value: 'year', label: 'Ročně' },
];

const SCHEDULE_MODES = [
  { value: 'calendar', label: 'Kalendářní režim', hint: 'Generuje se automaticky podle kalendáře, nezávisle na uzavření předchozího.' },
  { value: 'from_completion', label: 'Od posledního provedení', hint: 'Další termín se přepočítá po platném dokončení.' },
];

const PRIORITIES = [
  { value: 'low', label: 'Nízká' },
  { value: 'medium', label: 'Normální' },
  { value: 'high', label: 'Vysoká' },
  { value: 'urgent', label: 'Urgentní' },
];

interface Props {
  assetId: string;
  propertyId?: string;
  existing?: RecurringPlan;
  onClose: () => void;
}

export default function RecurringPlanForm({ assetId, propertyId, existing, onClose }: Props) {
  const createMutation = useCreateRecurringPlan();
  const updateMutation = useUpdateRecurringPlan();
  const qc = useQueryClient();
  const isEdit = !!existing;

  const { data: users = [] } = useQuery<TenantUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.get('/admin/users').then(r => r.data),
  });
  const activeUsers = users.filter(u => u.isActive);

  const [form, setForm] = useState({
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    scheduleMode: existing?.scheduleMode ?? 'calendar',
    frequencyUnit: existing?.frequencyUnit ?? 'day',
    frequencyInterval: String(existing?.frequencyInterval ?? 1),
    dayOfMonth: existing?.dayOfMonth != null ? String(existing.dayOfMonth) : '',
    monthOfYear: existing?.monthOfYear != null ? String(existing.monthOfYear) : '',
    leadDays: String(existing?.leadDays ?? 0),
    priority: existing?.priority ?? 'medium',
    assigneeUserId: existing?.assigneeUserId ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Název je povinný';
    const interval = parseInt(form.frequencyInterval);
    if (!interval || interval < 1) errs.frequencyInterval = 'Min. 1';
    const dom = parseInt(form.dayOfMonth);
    if (form.dayOfMonth && (dom < 1 || dom > 31)) errs.dayOfMonth = '1–31';
    const moy = parseInt(form.monthOfYear);
    if (form.monthOfYear && (moy < 1 || moy > 12)) errs.monthOfYear = '1–12';
    const ld = parseInt(form.leadDays);
    if (ld < 0) errs.leadDays = 'Min. 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const dto = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      assetId,
      propertyId: propertyId || undefined,
      scheduleMode: form.scheduleMode,
      frequencyUnit: form.frequencyUnit,
      frequencyInterval: parseInt(form.frequencyInterval),
      dayOfMonth: form.dayOfMonth ? parseInt(form.dayOfMonth) : undefined,
      monthOfYear: form.monthOfYear ? parseInt(form.monthOfYear) : undefined,
      leadDays: parseInt(form.leadDays) || 0,
      priority: form.priority,
      assigneeUserId: form.assigneeUserId || undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id: existing!.id, dto }, { onSuccess: () => onClose() });
    } else {
      createMutation.mutate(dto, {
        onSuccess: async () => {
          // Dismiss any active Mio insight for this asset (asset_no_recurring_plan)
          try {
            const res = await apiClient.get('/mio/insights', { params: { entityId: assetId, status: 'active' } });
            const insights = (res.data as any[]) ?? [];
            for (const insight of insights) {
              if (insight.code === 'asset_no_recurring_plan') {
                await apiClient.post(`/mio/insights/${insight.id}/dismiss`);
              }
            }
            qc.invalidateQueries({ queryKey: ['mio'] });
          } catch { /* best-effort — don't block close */ }
          onClose();
        },
      });
    }
  };

  const inputStyle = (field?: string): React.CSSProperties => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box',
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  const showDayOfMonth = form.frequencyUnit === 'month' || form.frequencyUnit === 'year';
  const showMonthOfYear = form.frequencyUnit === 'year';
  const modeHint = SCHEDULE_MODES.find(m => m.value === form.scheduleMode)?.hint;

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit opakovanou činnost' : 'Nová opakovaná činnost'} wide
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název činnosti *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle('title')}
          placeholder="např. Denní kontrola kotelny" />
        {errors.title && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.title}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Režim plánování</label>
          <select value={form.scheduleMode} onChange={e => set('scheduleMode', e.target.value)} style={inputStyle()}>
            {SCHEDULE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Priorita</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)} style={inputStyle()}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {modeHint && (
        <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 14, lineHeight: 1.5 }}>{modeHint}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Jednotka frekvence</label>
          <select value={form.frequencyUnit} onChange={e => set('frequencyUnit', e.target.value)} style={inputStyle()}>
            {FREQ_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Interval</label>
          <input type="number" min="1" value={form.frequencyInterval} onChange={e => set('frequencyInterval', e.target.value)}
            style={inputStyle('frequencyInterval')} />
          {errors.frequencyInterval && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.frequencyInterval}</div>}
        </div>
      </div>

      {(showDayOfMonth || showMonthOfYear) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {showDayOfMonth && (
            <div>
              <label className="form-label">Den v měsíci</label>
              <input type="number" min="1" max="31" value={form.dayOfMonth} onChange={e => set('dayOfMonth', e.target.value)}
                placeholder="1–31" style={inputStyle('dayOfMonth')} />
            </div>
          )}
          {showMonthOfYear && (
            <div>
              <label className="form-label">Měsíc v roce</label>
              <input type="number" min="1" max="12" value={form.monthOfYear} onChange={e => set('monthOfYear', e.target.value)}
                placeholder="1–12" style={inputStyle('monthOfYear')} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Předstih vytvoření požadavku (dny)</label>
          <input type="number" min="0" value={form.leadDays} onChange={e => set('leadDays', e.target.value)}
            style={inputStyle('leadDays')} />
        </div>
        <div>
          <label className="form-label">Řešitel</label>
          <select value={form.assigneeUserId} onChange={e => set('assigneeUserId', e.target.value)} style={inputStyle()}>
            <option value="">— bez řešitele —</option>
            {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={2} style={{ ...inputStyle(), resize: 'vertical' }} placeholder="Volitelný popis činnosti..." />
      </div>

      <div className="text-muted" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
        Požadavky se generují automaticky do Helpdesku podle nastaveného plánu.
      </div>
    </Modal>
  );
}
