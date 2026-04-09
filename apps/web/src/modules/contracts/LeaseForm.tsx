import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../shared/components';
import { FormSection, FormFooter } from '../../shared/components/FormSection';
import { FormField } from '../../shared/components/FormField';
import { useCreateContract, useUpdateContract } from './api/contracts.queries';
import type { ApiLeaseAgreement } from './api/contracts.api';
import { propertiesApi } from '../properties/properties-api';
import { residentsApi } from '../residents/api/residents.api';

interface Props {
  lease?: ApiLeaseAgreement;
  onClose: () => void;
}

export default function LeaseForm({ lease, onClose }: Props) {
  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract();
  const isEdit = !!lease;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  });
  const { data: residentsData } = useQuery({
    queryKey: ['residents', 'list', {}],
    queryFn: () => residentsApi.list(),
  });

  const residents = useMemo(() => {
    if (!residentsData) return [];
    return Array.isArray(residentsData) ? residentsData : (residentsData as any).data ?? [];
  }, [residentsData]);

  const [form, setForm] = useState({
    residentId: lease?.residentId || '',
    propertyId: lease?.propertyId || '',
    unitId: lease?.unitId || '',
    contractType: lease?.contractType || 'najem',
    monthlyRent: lease?.monthlyRent?.toString() || '',
    deposit: lease?.deposit?.toString() || '',
    startDate: lease?.startDate ? lease.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    endDate: lease?.endDate ? lease.endDate.slice(0, 10) : '',
    indefinite: lease?.indefinite ?? false,
    noticePeriod: lease?.noticePeriod?.toString() || '3',
    renewalType: lease?.renewalType || 'pisemna',
    note: lease?.note || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const selectedProp = properties?.find((p) => p.id === form.propertyId);
  const availableUnits = selectedProp?.units ?? [];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.propertyId) errs.propertyId = 'Vyberte nemovitost';
    if (!form.monthlyRent || isNaN(Number(form.monthlyRent))) errs.monthlyRent = 'Zadejte částku';
    if (!form.startDate) errs.startDate = 'Datum od je povinné';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const blurValidate = (field: string) => {
    const errs: Record<string, string> = {};
    if (field === 'propertyId' && !form.propertyId) errs.propertyId = 'Vyberte nemovitost';
    if (field === 'monthlyRent' && (!form.monthlyRent || isNaN(Number(form.monthlyRent)))) errs.monthlyRent = 'Zadejte částku';
    if (field === 'startDate' && !form.startDate) errs.startDate = 'Datum od je povinné';
    setErrors(e => Object.keys(errs).length ? { ...e, ...errs } : (delete e[field], { ...e }));
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      propertyId: form.propertyId,
      unitId: form.unitId || undefined,
      residentId: form.residentId || undefined,
      contractType: form.contractType,
      monthlyRent: Number(form.monthlyRent),
      deposit: form.deposit ? Number(form.deposit) : undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      indefinite: form.indefinite || !form.endDate,
      noticePeriod: Number(form.noticePeriod) || 3,
      renewalType: form.renewalType,
      note: form.note || undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id: lease!.id, dto: data }, { onSuccess: () => onClose() });
    } else {
      createMutation.mutate(data, { onSuccess: () => onClose() });
    }
  };

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit smlouvu' : 'Nová nájemní smlouva'}
      footer={<FormFooter onCancel={onClose} onSubmit={handleSubmit} isSubmitting={isPending} submitLabel={isEdit ? 'Uložit' : 'Vytvořit'} data-testid-save="contract-form-save" data-testid-cancel="contract-form-cancel" />}>

      <FormSection title="Základní údaje" defaultExpanded collapsible={false}>
        <FormField label="Nájemník" name="residentId" required={false}>
          <select id="residentId" value={form.residentId} onChange={(e) => set('residentId', e.target.value)} style={inputStyle()}>
            <option value="">— Vyberte nájemníka —</option>
            {residents.map((r: any) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
          </select>
        </FormField>
        <FormField label="Typ smlouvy" name="contractType" required={false}>
          <select id="contractType" value={form.contractType} onChange={(e) => set('contractType', e.target.value)} style={inputStyle()}>
            <option value="najem">Nájem</option>
            <option value="podnajem">Podnájem</option>
            <option value="sluzebni">Služební byt</option>
            <option value="jiny">Jiný</option>
          </select>
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Nemovitost" name="propertyId" error={errors.propertyId}>
            <select id="propertyId" value={form.propertyId} onChange={(e) => { set('propertyId', e.target.value); set('unitId', ''); }} onBlur={() => blurValidate('propertyId')} style={inputStyle('propertyId')}>
              <option value="">— Vyberte nemovitost —</option>
              {(properties ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          {form.propertyId && availableUnits.length > 0 && (
            <FormField label="Jednotka" name="unitId" required={false}>
              <select id="unitId" value={form.unitId} onChange={(e) => set('unitId', e.target.value)} style={inputStyle()}>
                <option value="">— Vyberte jednotku —</option>
                {availableUnits.map((u) => <option key={u.id} value={u.id}>{u.name}{u.area ? ` · ${u.area} m²` : ''}</option>)}
              </select>
            </FormField>
          )}
        </div>
      </FormSection>

      <FormSection title="Finanční podmínky" defaultExpanded>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Měsíční nájem (Kč)" name="monthlyRent" error={errors.monthlyRent}>
            <input id="monthlyRent" type="number" min="0" value={form.monthlyRent} onChange={(e) => set('monthlyRent', e.target.value)} onBlur={() => blurValidate('monthlyRent')} style={{ ...inputStyle('monthlyRent'), fontFamily: 'var(--font-mono)' }} />
          </FormField>
          <FormField label="Kauce (Kč)" name="deposit" required={false} helpText={form.monthlyRent ? `Doporučeno: ${Number(form.monthlyRent) * 2} Kč (2× nájem)` : undefined}>
            <input id="deposit" type="number" min="0" value={form.deposit} onChange={(e) => set('deposit', e.target.value)} style={{ ...inputStyle(), fontFamily: 'var(--font-mono)' }} placeholder={form.monthlyRent ? `${Number(form.monthlyRent) * 2}` : '0'} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Termíny" defaultExpanded>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Platnost od" name="startDate" error={errors.startDate}>
            <input id="startDate" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} onBlur={() => blurValidate('startDate')} style={inputStyle('startDate')} />
          </FormField>
          <FormField label="Platnost do" name="endDate" required={false}>
            <input id="endDate" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} style={inputStyle()} disabled={form.indefinite} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', marginTop: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.indefinite} onChange={(e) => { set('indefinite', e.target.checked); if (e.target.checked) set('endDate', ''); }} />
              Na dobu neurčitou
            </label>
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Výpovědní lhůta (měsíce)" name="noticePeriod" required={false}>
            <input id="noticePeriod" type="number" min="0" value={form.noticePeriod} onChange={(e) => set('noticePeriod', e.target.value)} style={inputStyle()} />
          </FormField>
          <FormField label="Prodloužení" name="renewalType" required={false}>
            <select id="renewalType" value={form.renewalType} onChange={(e) => set('renewalType', e.target.value)} style={inputStyle()}>
              <option value="pisemna">Písemná dohoda</option>
              <option value="automaticka">Automatické</option>
              <option value="nevztahuje">Nevztahuje se</option>
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Podmínky" defaultExpanded={false}>
        <FormField label="Poznámka" name="note" required={false}>
          <textarea id="note" value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical' as const }} />
        </FormField>
      </FormSection>
    </Modal>
  );
}
