import { useState } from 'react';
import { Modal, Button } from '../../../shared/components';
import { useCreatePrescription } from '../api/finance.queries';
import type { ApiProperty } from '../../properties/properties-api';
import { PRES_TYPE_LABELS } from './PrescriptionsTab';

export function PrescriptionForm({ properties, onClose }: {
  properties: ApiProperty[];
  onClose: () => void;
}) {
  const createMutation = useCreatePrescription();
  const [form, setForm] = useState({
    propertyId: '',
    unitId: '',
    type: 'rent' as string,
    amount: '',
    dueDay: '15',
    variableSymbol: '',
    description: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const selectedProperty = properties.find(p => p.id === form.propertyId);
  const availableUnits = selectedProperty?.units ?? [];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.propertyId) errs.propertyId = 'Povinné';
    if (!form.description.trim()) errs.description = 'Povinné';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Zadejte částku';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate(
      {
        propertyId: form.propertyId,
        unitId: form.unitId || undefined,
        type: form.type,
        amount: Number(form.amount),
        dueDay: Number(form.dueDay) || 15,
        variableSymbol: form.variableSymbol || undefined,
        description: form.description.trim(),
        validFrom: form.validFrom,
        validTo: form.validTo || undefined,
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
      title="Nový předpis"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Vytvářím...' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Nemovitost *</label>
          <select value={form.propertyId} onChange={e => { set('propertyId', e.target.value); set('unitId', ''); }} style={inputStyle('propertyId')}>
            <option value="">— vyberte —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {errors.propertyId && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.propertyId}</div>}
        </div>
        {availableUnits.length > 0 && (
          <div>
            <label className="form-label">Jednotka</label>
            <select value={form.unitId} onChange={e => set('unitId', e.target.value)} style={inputStyle()}>
              <option value="">— bez jednotky —</option>
              {availableUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Typ *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle()}>
            {Object.entries(PRES_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Částka (Kč) *</label>
          <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" style={inputStyle('amount')} />
          {errors.amount && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.amount}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Splatnost (den v měsíci)</label>
          <input type="number" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} min="1" max="28" style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Variabilní symbol</label>
          <input value={form.variableSymbol} onChange={e => set('variableSymbol', e.target.value)} placeholder="volitelný" style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis *</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Popis předpisu" style={inputStyle('description')} />
        {errors.description && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.description}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="form-label">Platnost od</label>
          <input type="date" value={form.validFrom} onChange={e => set('validFrom', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Platnost do</label>
          <input type="date" value={form.validTo} onChange={e => set('validTo', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {createMutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>Nepodařilo se vytvořit předpis.</div>
      )}
    </Modal>
  );
}
