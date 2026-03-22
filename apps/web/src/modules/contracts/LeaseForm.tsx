import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button } from '../../shared/components';
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
    if (!form.monthlyRent || isNaN(Number(form.monthlyRent))) errs.monthlyRent = 'Zadejte castku';
    if (!form.startDate) errs.startDate = 'Datum od je povinne';
    setErrors(errs);
    return Object.keys(errs).length === 0;
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
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} data-testid="contract-form-cancel">Zrusit</Button>
          <Button variant="primary" onClick={handleSubmit} data-testid="contract-form-save"
            disabled={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? 'Ulozit' : 'Vytvorit'}
          </Button>
        </div>
      }>

      {/* Resident */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Najemnik</label>
        <select value={form.residentId} onChange={(e) => set('residentId', e.target.value)} style={inputStyle()}>
          <option value="">-- Vyberte najemnika --</option>
          {residents.map((r: any) => (
            <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
          ))}
        </select>
      </div>

      {/* Contract type */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Typ smlouvy</label>
        <select value={form.contractType} onChange={(e) => set('contractType', e.target.value)} style={inputStyle()}>
          <option value="najem">Najem</option>
          <option value="podnajem">Podnajem</option>
          <option value="sluzebni">Sluzebni byt</option>
          <option value="jiny">Jiny</option>
        </select>
      </div>

      {/* Property */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Nemovitost *</label>
        <select value={form.propertyId} onChange={(e) => { set('propertyId', e.target.value); set('unitId', ''); }} style={inputStyle('propertyId')}>
          <option value="">-- Vyber nemovitost --</option>
          {(properties ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {errors.propertyId && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.propertyId}</div>}
      </div>

      {/* Unit */}
      {form.propertyId && availableUnits.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Jednotka</label>
          <select value={form.unitId} onChange={(e) => set('unitId', e.target.value)} style={inputStyle()}>
            <option value="">-- Vyber jednotku --</option>
            {availableUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}{u.area ? ` · ${u.area} m2` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Rent + Deposit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Mesicni najem (Kc) *</label>
          <input type="number" min="0" value={form.monthlyRent} onChange={(e) => set('monthlyRent', e.target.value)} style={inputStyle('monthlyRent')} />
          {errors.monthlyRent && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.monthlyRent}</div>}
        </div>
        <div>
          <label className="form-label">Kauce (Kc)</label>
          <input type="number" min="0" value={form.deposit} onChange={(e) => set('deposit', e.target.value)}
            style={inputStyle()} placeholder={form.monthlyRent ? `${Number(form.monthlyRent) * 2}` : '0'} />
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Platnost od *</label>
          <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} style={inputStyle('startDate')} />
          {errors.startDate && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.startDate}</div>}
        </div>
        <div>
          <label className="form-label">Platnost do</label>
          <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)}
            style={inputStyle()} disabled={form.indefinite} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', marginTop: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.indefinite}
              onChange={(e) => { set('indefinite', e.target.checked); if (e.target.checked) set('endDate', ''); }} />
            Na dobu neurcitou
          </label>
        </div>
      </div>

      {/* Notice period + Renewal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Výpovědní lhůta (měsíce)</label>
          <input type="number" min="0" value={form.noticePeriod} onChange={(e) => set('noticePeriod', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Prodlouzeni</label>
          <select value={form.renewalType} onChange={(e) => set('renewalType', e.target.value)} style={inputStyle()}>
            <option value="pisemna">Pisemna dohoda</option>
            <option value="automaticka">Automaticke</option>
            <option value="nevztahuje">Nevztahuje se</option>
          </select>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="form-label">Poznamka</label>
        <textarea value={form.note} onChange={(e) => set('note', e.target.value)}
          rows={2} style={{ ...inputStyle(), resize: 'vertical' as const }} />
      </div>
    </Modal>
  );
}
