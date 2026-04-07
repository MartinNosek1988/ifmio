import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../shared/components';
import { FormSection, FormFooter } from '../../shared/components/FormSection';
import { FormField } from '../../shared/components/FormField';
import { useCreateWorkOrder } from './api/workorders.queries';
import { propertiesApi } from '../properties/properties-api';
import { apiClient } from '../../core/api/client';
import { useAuthStore } from '../../core/auth/auth.store';
import { WO_PRIORITY_LABELS } from '../../constants/labels';

interface TenantUser { id: string; name: string; email: string; role: string; isActive: boolean }
interface AssetOption { id: string; name: string; location: string | null; property?: { name: string } | null }

interface Props {
  onClose: () => void;
}

export default function WorkOrderForm({ onClose }: Props) {
  const createMutation = useCreateWorkOrder();
  const currentUser = useAuthStore((s) => s.user);

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  });
  const { data: users = [] } = useQuery<TenantUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.get('/admin/users').then((r) => r.data),
  });
  const { data: assetsData } = useQuery<{ data: AssetOption[] }>({
    queryKey: ['assets', 'list-picker'],
    queryFn: () => apiClient.get('/assets', { params: { limit: 500 } }).then((r) => r.data),
  });
  const assets = assetsData?.data ?? [];
  const activeUsers = users.filter((u: TenantUser) => u.isActive);

  const [form, setForm] = useState({
    title: '', description: '', priority: 'normalni',
    propertyId: '', unitId: '', assetId: '',
    assigneeUserId: '', dispatcherUserId: '',
    deadline: '', estimatedHours: '', laborCost: '', materialCost: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const selectedProp = properties?.find(p => p.id === form.propertyId);
  const availableUnits = useMemo(() => selectedProp?.units ?? [], [selectedProp]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Název je povinný';
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
      assetId: form.assetId || undefined,
      assigneeUserId: form.assigneeUserId || undefined,
      dispatcherUserId: form.dispatcherUserId || undefined,
      requesterUserId: currentUser?.id,
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
    <Modal open onClose={onClose} title="Nový pracovní úkol" wide
      footer={<FormFooter onCancel={onClose} onSubmit={handleSubmit} isSubmitting={createMutation.isPending} submitLabel="Vytvořit" data-testid-save="wo-form-save" data-testid-cancel="wo-form-cancel" />}>

      <FormSection title="Základní informace" defaultExpanded collapsible={false}>
        <FormField label="Název úkolu" name="title" error={errors.title}>
          <input data-testid="wo-form-title" id="title" value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle('title')} placeholder="Stručný popis práce" onBlur={(ev) => { const val = ev.currentTarget.value.trim(); if (!val) setErrors(e => ({ ...e, title: 'Název je povinný' })); else setErrors(e => { const next = { ...e }; delete next.title; return next; }); }} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Priorita" name="priority" required={false}>
            <select data-testid="wo-form-priority" id="priority" value={form.priority} onChange={e => set('priority', e.target.value)} style={inputStyle()}>
              {Object.entries(WO_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Termín realizace" name="deadline" required={false}>
            <input data-testid="wo-form-deadline" id="deadline" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} style={inputStyle()} />
          </FormField>
        </div>
        <FormField label="Popis" name="description" required={false}>
          <textarea data-testid="wo-form-description" id="description" value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inputStyle(), resize: 'vertical' as const }} placeholder="Podrobný popis práce..." />
        </FormField>
      </FormSection>

      <FormSection title="Přiřazení" defaultExpanded>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Nemovitost" name="propertyId" required={false}>
            <select data-testid="wo-form-property" id="propertyId" value={form.propertyId} onChange={e => { set('propertyId', e.target.value); set('unitId', ''); }} style={inputStyle()}>
              <option value="">— vyberte —</option>
              {(properties ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          {form.propertyId && availableUnits.length > 0 && (
            <FormField label="Jednotka" name="unitId" required={false}>
              <select id="unitId" value={form.unitId} onChange={e => set('unitId', e.target.value)} style={inputStyle()}>
                <option value="">— bez jednotky —</option>
                {availableUnits.map(u => <option key={u.id} value={u.id}>{u.name}{u.area ? ` · ${u.area} m²` : ''}</option>)}
              </select>
            </FormField>
          )}
        </div>
        <FormField label="Zařízení" name="assetId" required={false}>
          <select data-testid="wo-form-asset" id="assetId" value={form.assetId} onChange={e => set('assetId', e.target.value)} style={inputStyle()}>
            <option value="">— bez zařízení —</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}{a.location ? ` (${a.location})` : ''}</option>)}
          </select>
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Řešitel úkolu" name="assigneeUserId" required={false}>
            <select data-testid="wo-form-assignee" id="assigneeUserId" value={form.assigneeUserId} onChange={e => set('assigneeUserId', e.target.value)} style={inputStyle()}>
              <option value="">— bez řešitele —</option>
              {activeUsers.map((u: TenantUser) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
          <FormField label="Dispečer úkolu" name="dispatcherUserId" required={false}>
            <select id="dispatcherUserId" value={form.dispatcherUserId} onChange={e => set('dispatcherUserId', e.target.value)} style={inputStyle()}>
              <option value="">— bez dispečera —</option>
              {activeUsers.map((u: TenantUser) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Náklady a odhad" defaultExpanded={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FormField label="Odhad (hodiny)" name="estimatedHours" required={false}>
            <input id="estimatedHours" type="number" min="0" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} style={inputStyle()} placeholder="0" />
          </FormField>
          <FormField label="Náklady práce (Kč)" name="laborCost" required={false}>
            <input id="laborCost" type="number" min="0" value={form.laborCost} onChange={e => set('laborCost', e.target.value)} style={{ ...inputStyle(), fontFamily: 'var(--font-mono)' }} placeholder="0" />
          </FormField>
          <FormField label="Materiál (Kč)" name="materialCost" required={false}>
            <input id="materialCost" type="number" min="0" value={form.materialCost} onChange={e => set('materialCost', e.target.value)} style={{ ...inputStyle(), fontFamily: 'var(--font-mono)' }} placeholder="0" />
          </FormField>
        </div>
      </FormSection>
    </Modal>
  );
}
