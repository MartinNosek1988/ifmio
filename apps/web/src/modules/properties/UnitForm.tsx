import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { apiClient } from '../../shared/api/client';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  propertyId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UnitForm({ propertyId, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', floor: '', area: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Název je povinný';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiClient.post(`/properties/${propertyId}/units`, {
        name: form.name,
        floor: form.floor ? parseInt(form.floor) : undefined,
        area: form.area ? parseFloat(form.area) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      onSuccess?.();
    } catch {
      setErrors({ submit: 'Nepodařilo se vytvořit jednotku' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
    boxSizing: 'border-box' as const,
  });

  return (
    <Modal
      open onClose={onClose} title="Nová jednotka"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Ukládám...' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Název jednotky *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Byt 1, Byt 2A, Garáž G1..." style={inputStyle('name')} />
          {errors.name && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>}
        </div>
        <div>
          <label className="form-label">Patro</label>
          <input type="number" value={form.floor} onChange={e => set('floor', e.target.value)}
            placeholder="1" style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Plocha (m²)</label>
          <input type="number" value={form.area} onChange={e => set('area', e.target.value)}
            placeholder="65" style={inputStyle()} />
        </div>
      </div>
      {errors.submit && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{errors.submit}</div>}
    </Modal>
  );
}