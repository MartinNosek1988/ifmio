import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { useCreateWorkOrder } from './api/workorders.queries';
import { propertiesApi } from '../properties/properties-api';
import { WO_PRIORITY_LABELS } from '../../constants/labels';

interface Props {
  onClose: () => void;
}

export default function WorkOrderForm({ onClose }: Props) {
  const createMutation = useCreateWorkOrder();

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'normalni',
    propertyId: '',
    unitId: '',
    assignee: '',
    requester: '',
    deadline: '',
    estimatedHours: '',
    laborCost: '',
    materialCost: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const selectedProp = properties?.find(p => p.id === form.propertyId);
  const availableUnits = useMemo(() => selectedProp?.units ?? [], [selectedProp]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Nazev je povinny';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      propertyId: form.propertyId || undefined,
      unitId: form.unitId || undefined,
      assignee: form.assignee || undefined,
      requester: form.requester || undefined,
      deadline: form.deadline || undefined,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      laborCost: form.laborCost ? Number(form.laborCost) : undefined,
      materialCost: form.materialCost ? Number(form.materialCost) : undefined,
    }, { onSuccess: () => onClose() });
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
          <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>Vytvorit</Button>
        </div>
      }>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nazev *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle('title')} placeholder="Strucny popis prace" />
        {errors.title && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.title}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Priorita</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)} style={inputStyle()}>
            {Object.entries(WO_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Termin</label>
          <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nemovitost</label>
        <select value={form.propertyId} onChange={e => { set('propertyId', e.target.value); set('unitId', ''); }} style={inputStyle()}>
          <option value="">-- Vyber nemovitost --</option>
          {(properties ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {form.propertyId && availableUnits.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Jednotka</label>
          <select value={form.unitId} onChange={e => set('unitId', e.target.value)} style={inputStyle()}>
            <option value="">-- Bez jednotky --</option>
            {availableUnits.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}{u.area ? ` · ${u.area} m2` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Resitel</label>
          <input value={form.assignee} onChange={e => set('assignee', e.target.value)} style={inputStyle()} placeholder="Jmeno resitele" />
        </div>
        <div>
          <label className="form-label">Zadavatel</label>
          <input value={form.requester} onChange={e => set('requester', e.target.value)} style={inputStyle()} placeholder="Jmeno zadavatele" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Odhad (hodiny)</label>
          <input type="number" min="0" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} style={inputStyle()} placeholder="0" />
        </div>
        <div>
          <label className="form-label">Naklady prace (Kc)</label>
          <input type="number" min="0" value={form.laborCost} onChange={e => set('laborCost', e.target.value)} style={inputStyle()} placeholder="0" />
        </div>
        <div>
          <label className="form-label">Material (Kc)</label>
          <input type="number" min="0" value={form.materialCost} onChange={e => set('materialCost', e.target.value)} style={inputStyle()} placeholder="0" />
        </div>
      </div>

      <div>
        <label className="form-label">Popis</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} style={{ ...inputStyle(), resize: 'vertical' as const }} placeholder="Podrobny popis prace..." />
      </div>
    </Modal>
  );
}
