import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { propertiesApi } from './properties-api';
import type { ApiUnit } from './properties-api';

interface Props {
  propertyId: string;
  unit?: ApiUnit;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UnitForm({ propertyId, unit, onClose, onSuccess }: Props) {
  const isEdit = !!unit;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: unit?.name ?? '',
    floor: unit?.floor != null ? String(unit.floor) : '',
    area: unit?.area != null ? String(unit.area) : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        floor: form.floor ? parseInt(form.floor) : undefined,
        area: form.area ? parseFloat(form.area) : undefined,
      };
      return isEdit
        ? propertiesApi.updateUnit(propertyId, unit!.id, payload)
        : propertiesApi.createUnit(propertyId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onSuccess?.();
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Název je povinný';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  const inputStyle = (field?: string) => ({
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)',
    boxSizing: 'border-box' as const,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Upravit — ${unit!.name}` : 'Nová jednotka'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Název jednotky *</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Byt 1, Byt 2A, Garáž G1..."
            style={inputStyle('name')}
          />
          {errors.name && (
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>
          )}
        </div>
        <div>
          <label className="form-label">Patro</label>
          <input
            type="number"
            value={form.floor}
            onChange={(e) => set('floor', e.target.value)}
            placeholder="1"
            style={inputStyle()}
          />
        </div>
        <div>
          <label className="form-label">Plocha (m²)</label>
          <input
            type="number"
            step="0.01"
            value={form.area}
            onChange={(e) => set('area', e.target.value)}
            placeholder="65"
            style={inputStyle()}
          />
        </div>
      </div>
      {(errors.submit || mutation.isError) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
          {errors.submit || 'Nepodařilo se uložit jednotku'}
        </div>
      )}
    </Modal>
  );
}
