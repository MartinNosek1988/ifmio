import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
import { apiClient } from '../../core/api/client';
import type { ApiAssetType } from '../asset-types/api/asset-types.api';

interface Props {
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'tzb', label: 'TZB' },
  { value: 'stroje', label: 'Stroje' },
  { value: 'vybaveni', label: 'Vybavení' },
  { value: 'vozidla', label: 'Vozidla' },
  { value: 'it', label: 'IT' },
  { value: 'ostatni', label: 'Ostatní' },
];

export default function AssetForm({ onClose }: Props) {
  const { data: properties = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['properties', 'list'],
    queryFn: () => apiClient.get('/properties').then((r) =>
      Array.isArray(r.data) ? r.data : r.data.data ?? [],
    ),
    staleTime: 60_000,
  });

  const { data: assetTypes = [] } = useQuery<ApiAssetType[]>({
    queryKey: ['asset-types', 'list'],
    queryFn: () => apiClient.get('/asset-types').then((r) => r.data),
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/assets', data),
    onSuccess: () => onClose(),
  });

  const [form, setForm] = useState({
    name: '', category: 'ostatni', manufacturer: '', model: '', serialNumber: '',
    location: '', propertyId: '', unitId: '', assetTypeId: '', purchaseDate: '', purchaseValue: '',
    warrantyUntil: '', serviceInterval: '', nextServiceDate: '', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Název je povinný';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMut.mutate({
      name: form.name,
      category: form.category,
      manufacturer: form.manufacturer || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      location: form.location || undefined,
      propertyId: form.propertyId || undefined,
      unitId: form.unitId || undefined,
      assetTypeId: form.assetTypeId || undefined,
      purchaseDate: form.purchaseDate || undefined,
      purchaseValue: form.purchaseValue ? Number(form.purchaseValue) : undefined,
      warrantyUntil: form.warrantyUntil || undefined,
      serviceInterval: form.serviceInterval ? Number(form.serviceInterval) : undefined,
      nextServiceDate: form.nextServiceDate || undefined,
      notes: form.notes || undefined,
    });
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Nové zařízení"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} data-testid="asset-form-cancel">Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMut.isPending} data-testid="asset-form-save">
            {createMut.isPending ? 'Ukládám...' : 'Vytvořit'}
          </Button>
        </div>
      }>

      {createMut.isError && (
        <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: '.85rem', marginBottom: 12 }}>
          Vytvoření selhalo
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Název zařízení *</label>
        <input data-testid="asset-form-name" value={form.name} onChange={(e) => set('name', e.target.value)} style={inputStyle('name')} placeholder="např. Hlavní kotel" />
        {errors.name && <div data-testid="asset-form-error-name" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.name}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Kategorie</label>
          <select data-testid="asset-form-category" value={form.category} onChange={(e) => set('category', e.target.value)} style={inputStyle()}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Typ zařízení</label>
          <select value={form.assetTypeId} onChange={(e) => set('assetTypeId', e.target.value)} style={inputStyle()}>
            <option value="">— Bez typu —</option>
            {assetTypes.filter((t) => t.isActive).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
            ))}
          </select>
          {form.assetTypeId && (() => {
            const sel = assetTypes.find((t) => t.id === form.assetTypeId)
            return sel?._count?.activityAssignments ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', marginTop: 3 }}>
                Tento typ má definováno {sel._count.activityAssignments} činností
              </div>
            ) : null
          })()}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Výrobce</label>
          <input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Model</label>
          <input value={form.model} onChange={(e) => set('model', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Sériové číslo</label>
          <input value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Umístění</label>
          <input value={form.location} onChange={(e) => set('location', e.target.value)} style={inputStyle()} placeholder="např. Suterén, 2.NP" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Nemovitost</label>
          <select value={form.propertyId} onChange={(e) => set('propertyId', e.target.value)} style={inputStyle()}>
            <option value="">— Žádná —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Datum pořízení</label>
          <input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Pořizovací hodnota (Kč)</label>
          <input type="number" value={form.purchaseValue} onChange={(e) => set('purchaseValue', e.target.value)} style={inputStyle()} placeholder="0" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Záruka do</label>
          <input type="date" value={form.warrantyUntil} onChange={(e) => set('warrantyUntil', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Interval servisu (měsíce)</label>
          <input type="number" value={form.serviceInterval} onChange={(e) => set('serviceInterval', e.target.value)} style={inputStyle()} placeholder="12" />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Příští servis</label>
        <input type="date" value={form.nextServiceDate} onChange={(e) => set('nextServiceDate', e.target.value)} style={inputStyle()} />
      </div>

      <div>
        <label className="form-label">Poznámka</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ ...inputStyle(), minHeight: 60 }} />
      </div>
    </Modal>
  );
}
