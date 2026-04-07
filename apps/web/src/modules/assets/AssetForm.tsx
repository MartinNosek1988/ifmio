import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '../../shared/components';
import { FormSection, FormFooter } from '../../shared/components/FormSection';
import { FormField } from '../../shared/components/FormField';
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

  const blurValidate = (field: string) => {
    if (field === 'name' && !form.name.trim()) setErrors(e => ({ ...e, name: 'Název je povinný' }));
    else setErrors(e => { const { [field]: _, ...rest } = e; return rest; });
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMut.mutate({
      name: form.name, category: form.category,
      manufacturer: form.manufacturer || undefined, model: form.model || undefined,
      serialNumber: form.serialNumber || undefined, location: form.location || undefined,
      propertyId: form.propertyId || undefined, unitId: form.unitId || undefined,
      assetTypeId: form.assetTypeId || undefined, purchaseDate: form.purchaseDate || undefined,
      purchaseValue: form.purchaseValue ? Number(form.purchaseValue) : undefined,
      warrantyUntil: form.warrantyUntil || undefined,
      serviceInterval: form.serviceInterval ? Number(form.serviceInterval) : undefined,
      nextServiceDate: form.nextServiceDate || undefined, notes: form.notes || undefined,
    });
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title="Nové zařízení"
      footer={<FormFooter onCancel={onClose} onSubmit={handleSubmit} isSubmitting={createMut.isPending} submitLabel="Vytvořit" data-testid-save="asset-form-save" data-testid-cancel="asset-form-cancel" />}>

      {createMut.isError && (
        <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: '.85rem', marginBottom: 12 }}>
          Vytvoření selhalo
        </div>
      )}

      <FormSection title="Základní informace" defaultExpanded collapsible={false}>
        <FormField label="Název zařízení" name="name" error={errors.name}>
          <input data-testid="asset-form-name" id="name" value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => blurValidate('name')} style={inputStyle('name')} placeholder="např. Hlavní kotel" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Kategorie" name="category" required={false}>
            <select data-testid="asset-form-category" id="category" value={form.category} onChange={(e) => set('category', e.target.value)} style={inputStyle()}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </FormField>
          <FormField label="Typ zařízení" name="assetTypeId" required={false}>
            <select id="assetTypeId" value={form.assetTypeId} onChange={(e) => set('assetTypeId', e.target.value)} style={inputStyle()}>
              <option value="">— Bez typu —</option>
              {assetTypes.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
            </select>
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Výrobce" name="manufacturer" required={false}>
            <input id="manufacturer" value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} style={inputStyle()} />
          </FormField>
          <FormField label="Model" name="model" required={false}>
            <input id="model" value={form.model} onChange={(e) => set('model', e.target.value)} style={inputStyle()} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Umístění" defaultExpanded>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Nemovitost" name="propertyId" required={false}>
            <select id="propertyId" value={form.propertyId} onChange={(e) => set('propertyId', e.target.value)} style={inputStyle()}>
              <option value="">— Žádná —</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Umístění" name="location" required={false}>
            <input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} style={inputStyle()} placeholder="např. Suterén, 2.NP" />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Technické údaje" defaultExpanded={false}>
        <FormField label="Sériové číslo" name="serialNumber" required={false}>
          <input id="serialNumber" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} style={{ ...inputStyle(), fontFamily: 'var(--font-mono)' }} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Datum pořízení" name="purchaseDate" required={false}>
            <input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} style={inputStyle()} />
          </FormField>
          <FormField label="Pořizovací hodnota (Kč)" name="purchaseValue" required={false}>
            <input id="purchaseValue" type="number" value={form.purchaseValue} onChange={(e) => set('purchaseValue', e.target.value)} style={{ ...inputStyle(), fontFamily: 'var(--font-mono)' }} placeholder="0" />
          </FormField>
        </div>
        <FormField label="Záruka do" name="warrantyUntil" required={false}>
          <input id="warrantyUntil" type="date" value={form.warrantyUntil} onChange={(e) => set('warrantyUntil', e.target.value)} style={inputStyle()} />
        </FormField>
      </FormSection>

      <FormSection title="Revize a servis" defaultExpanded={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Interval servisu (měsíce)" name="serviceInterval" required={false}>
            <input id="serviceInterval" type="number" value={form.serviceInterval} onChange={(e) => set('serviceInterval', e.target.value)} style={inputStyle()} placeholder="12" />
          </FormField>
          <FormField label="Příští servis" name="nextServiceDate" required={false}>
            <input id="nextServiceDate" type="date" value={form.nextServiceDate} onChange={(e) => set('nextServiceDate', e.target.value)} style={inputStyle()} />
          </FormField>
        </div>
        <FormField label="Poznámka" name="notes" required={false}>
          <textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ ...inputStyle(), minHeight: 60 }} />
        </FormField>
      </FormSection>
    </Modal>
  );
}
