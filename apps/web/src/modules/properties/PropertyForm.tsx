import { useState } from 'react';
import { Modal, Button } from '../../shared/components';
import { useCreateProperty, useUpdateProperty } from './use-properties';
import type { ApiProperty } from './properties-api';

interface Props {
  property?: ApiProperty;
  onClose: () => void;
}

const PROPERTY_TYPES = [
  { value: 'bytdum', label: 'Bytový dům' },
  { value: 'roddum', label: 'Rodinný dům' },
  { value: 'komer', label: 'Komerční' },
  { value: 'prumysl', label: 'Průmyslový' },
  { value: 'pozemek', label: 'Pozemek' },
  { value: 'garaz', label: 'Garáž' },
];

const OWNERSHIP_TYPES = [
  { value: 'vlastnictvi', label: 'Vlastnictví' },
  { value: 'druzstvo', label: 'Družstvo' },
  { value: 'pronajem', label: 'Pronájem' },
];

export default function PropertyForm({ property, onClose }: Props) {
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();
  const isEdit = !!property;

  const [form, setForm] = useState({
    name: property?.name || '',
    address: property?.address || '',
    city: property?.city || '',
    postalCode: property?.postalCode || '',
    type: property?.type || 'bytdum',
    ownership: property?.ownership || 'vlastnictvi',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Název je povinný';
    if (!form.address.trim()) errs.address = 'Adresa je povinná';
    if (!form.city.trim()) errs.city = 'Město je povinné';
    if (!form.postalCode.trim()) errs.postalCode = 'PSČ je povinné';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isEdit) {
      await updateMutation.mutateAsync({ id: property!.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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
      title={isEdit ? 'Upravit nemovitost' : 'Nová nemovitost'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      {/* Typ */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Typ nemovitosti</label>
        <select value={form.type} onChange={(e) => set('type', e.target.value)} style={inputStyle()}>
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Vlastnictví */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Typ vlastnictví</label>
        <select value={form.ownership} onChange={(e) => set('ownership', e.target.value)} style={inputStyle()}>
          {OWNERSHIP_TYPES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Název */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Název *</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} style={inputStyle('name')} />
        {errors.name && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>}
      </div>

      {/* Adresa */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Adresa *</label>
        <input value={form.address} onChange={(e) => set('address', e.target.value)} style={inputStyle('address')} />
        {errors.address && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.address}</div>}
      </div>

      {/* Město + PSČ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="form-label">Město *</label>
          <input value={form.city} onChange={(e) => set('city', e.target.value)} style={inputStyle('city')} />
          {errors.city && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.city}</div>}
        </div>
        <div>
          <label className="form-label">PSČ *</label>
          <input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} style={inputStyle('postalCode')} />
          {errors.postalCode && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.postalCode}</div>}
        </div>
      </div>

      {(createMutation.error || updateMutation.error) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>
          Nepodařilo se uložit nemovitost.
        </div>
      )}
    </Modal>
  );
}
