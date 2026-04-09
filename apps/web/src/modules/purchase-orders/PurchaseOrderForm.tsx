import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Trash2 } from 'lucide-react';
import { Modal, Button, FormSection, FormFooter } from '../../shared/components';
import { FormField } from '../../shared/components/FormField';
import { formatKc } from '../../shared/utils/format';
import { useAresLookup } from '../../shared/hooks/useAresLookup';
import { purchaseOrdersApi } from './api/purchase-orders.api';
import type { ApiPurchaseOrder } from './api/purchase-orders.api';
import { apiClient } from '../../core/api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: ApiPurchaseOrder;
}

interface FormItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

const UNITS = ['ks', 'hod', 'm²', 'm'];

const emptyItem = (): FormItem => ({ description: '', quantity: '1', unit: 'ks', unitPrice: '0' });

function calcItemTotal(item: FormItem): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
}

export function PurchaseOrderForm({ open, onClose, onSuccess, editData }: Props) {
  const { t } = useTranslation();
  const isEdit = !!editData;

  const [form, setForm] = useState({
    propertyId: editData?.propertyId || '',
    sourceType: editData?.sourceType || 'manual',
    description: editData?.description || '',
    deliveryDate: editData?.deliveryDate?.slice(0, 10) || '',
    validUntil: editData?.validUntil?.slice(0, 10) || '',
    deliveryAddress: editData?.deliveryAddress || '',
    supplierIco: editData?.supplierIco || '',
    supplierName: editData?.supplierName || '',
    supplierDic: (editData as any)?.supplierDic || '',
    supplierEmail: editData?.supplierEmail || '',
    vatRate: editData?.vatRate?.toString() || '21',
    currency: editData?.currency || 'CZK',
  });

  const [items, setItems] = useState<FormItem[]>(
    editData?.items?.length
      ? editData.items
          .sort((a, b) => a.position - b.position)
          .map(i => ({
            description: i.description,
            quantity: String(i.quantity),
            unit: i.unit,
            unitPrice: String(i.unitPrice),
          }))
      : [emptyItem()]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { lookup: aresLookup, loading: aresLoading, error: aresError, success: aresSuccess, defunct: aresDefunct } = useAresLookup();

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiClient.get<{ id: string; name: string }[]>('/properties').then(r => r.data),
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const setItem = (index: number, key: keyof FormItem, value: string) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [key]: value } : it));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Computed totals
  const amountBase = items.reduce((sum, it) => sum + calcItemTotal(it), 0);
  const vatRate = parseFloat(form.vatRate) || 0;
  const vatAmount = Math.round(amountBase * vatRate) / 100;
  const amountTotal = amountBase + vatAmount;

  const handleAresLookup = async () => {
    const result = await aresLookup(form.supplierIco);
    if (result) {
      setForm(f => ({
        ...f,
        supplierName: result.nazev || f.supplierName,
        supplierDic: result.dic || f.supplierDic,
      }));
    }
  };

  const createMut = useMutation({
    mutationFn: (data: any) => purchaseOrdersApi.create(data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchaseOrdersApi.update(id, data),
  });

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.supplierName) errs.supplierName = t('purchaseOrder.errors.supplierRequired');
    if (items.length === 0 || !items[0].description) errs.items = t('purchaseOrder.errors.itemsRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      propertyId: form.propertyId || undefined,
      sourceType: form.sourceType || 'manual',
      description: form.description || undefined,
      deliveryDate: form.deliveryDate || undefined,
      validUntil: form.validUntil || undefined,
      deliveryAddress: form.deliveryAddress || undefined,
      supplierIco: form.supplierIco || undefined,
      supplierDic: form.supplierDic || undefined,
      supplierName: form.supplierName,
      supplierEmail: form.supplierEmail || undefined,
      vatRate,
      vatAmount,
      amountBase,
      amountTotal,
      currency: form.currency,
      items: items.map((it, i) => ({
        description: it.description,
        quantity: Number.isFinite(parseFloat(it.quantity)) && parseFloat(it.quantity) > 0
          ? parseFloat(it.quantity)
          : 1,
        unit: it.unit,
        unitPrice: parseFloat(it.unitPrice) || 0,
        totalPrice: calcItemTotal(it),
        position: i + 1,
      })),
    };

    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: editData!.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onSuccess();
    } catch {
      setErrors({ _form: t('purchaseOrder.errors.saveFailed') });
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('purchaseOrder.edit', { number: editData!.number }) : t('purchaseOrder.create')}
      wide
      footer={
        <FormFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSaving}
          submitLabel={isEdit ? t('purchaseOrder.submitSave') : t('purchaseOrder.submitCreate')}
        />
      }
    >
      {errors._form && (
        <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: '0.88rem' }}>{errors._form}</div>
      )}

      {/* Header section */}
      <FormSection title={t('purchaseOrder.sections.basic')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label={t('purchaseOrder.fields.property')} name="propertyId" required={false}>
            <select className="input" value={form.propertyId} onChange={e => set('propertyId', e.target.value)}>
              <option value="">{t('purchaseOrder.fields.propertyPlaceholder')}</option>
              {properties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('purchaseOrder.fields.sourceType')} name="sourceType" required={false}>
            <select className="input" value={form.sourceType} onChange={e => set('sourceType', e.target.value)}>
              <option value="manual">{t('purchaseOrder.fields.sourceManual')}</option>
              <option value="work_order">{t('purchaseOrder.fields.sourceWorkOrder')}</option>
              <option value="helpdesk">{t('purchaseOrder.fields.sourceHelpdesk')}</option>
            </select>
          </FormField>
        </div>
        <FormField label={t('purchaseOrder.fields.description')} name="description" required={false}>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FormField label={t('purchaseOrder.fields.deliveryDate')} name="deliveryDate" required={false}>
            <input className="input" type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} />
          </FormField>
          <FormField label={t('purchaseOrder.fields.validUntil')} name="validUntil" required={false}>
            <input className="input" type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} />
          </FormField>
          <FormField label={t('purchaseOrder.fields.currency')} name="currency" required={false}>
            <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
              <option value="CZK">CZK</option>
              <option value="EUR">EUR</option>
            </select>
          </FormField>
        </div>
        <FormField label={t('purchaseOrder.fields.deliveryAddress')} name="deliveryAddress" required={false}>
          <input className="input" value={form.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} />
        </FormField>
      </FormSection>

      {/* Supplier section */}
      <FormSection title={t('purchaseOrder.sections.supplier')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <FormField label={t('purchaseOrder.fields.supplierIco')} name="supplierIco" required={false} error={aresError || undefined}>
            <input
              className="input"
              value={form.supplierIco}
              onChange={e => set('supplierIco', e.target.value)}
              onBlur={async () => {
                if (form.supplierIco && /^\d{8}$/.test(form.supplierIco.trim())) {
                  const result = await aresLookup(form.supplierIco);
                  if (result) {
                    setForm(f => ({
                      ...f,
                      supplierName: result.nazev || f.supplierName,
                      supplierDic: result.dic || f.supplierDic,
                    }));
                  }
                }
              }}
              placeholder="12345678"
              maxLength={8}
              style={{ fontFamily: 'var(--font-mono, monospace)' }}
            />
          </FormField>
          <Button onClick={handleAresLookup} disabled={aresLoading || !form.supplierIco} icon={<Search size={14} />}>
            {aresLoading ? t('purchaseOrder.aresSearching') : t('purchaseOrder.aresLookup')}
          </Button>
        </div>
        {aresSuccess && <div style={{ color: 'var(--success, #22c55e)', fontSize: '0.78rem', marginTop: -4, marginBottom: 8 }}>{aresSuccess}</div>}
        {aresDefunct && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 4, padding: '4px 8px', color: 'var(--danger)', fontSize: '0.78rem', marginTop: -4, marginBottom: 8 }}>{t('purchaseOrder.aresDefunct', { status: aresDefunct })}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label={t('purchaseOrder.fields.supplierName')} name="supplierName" error={errors.supplierName}>
            <input className="input" value={form.supplierName} onChange={e => set('supplierName', e.target.value)} placeholder={t('purchaseOrder.fields.supplierNamePlaceholder')} />
          </FormField>
          <FormField label={t('purchaseOrder.fields.supplierDic')} name="supplierDic" required={false}>
            <input className="input" value={form.supplierDic} onChange={e => set('supplierDic', e.target.value)} placeholder="CZ12345678" style={{ fontFamily: 'var(--font-mono, monospace)' }} />
          </FormField>
        </div>
        <FormField label={t('purchaseOrder.fields.supplierEmail')} name="supplierEmail" required={false}>
          <input className="input" type="email" value={form.supplierEmail} onChange={e => set('supplierEmail', e.target.value)} placeholder="objednavky@dodavatel.cz" />
        </FormField>
      </FormSection>

      {/* Items section */}
      <FormSection title={t('purchaseOrder.sections.items')}>
        {errors.items && (
          <div style={{ color: 'var(--danger)', marginBottom: 8, fontSize: '0.88rem' }}>{errors.items}</div>
        )}
        <table className="table" style={{ width: '100%', marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={{ width: '40%' }}>{t('purchaseOrder.fields.itemDescription')}</th>
              <th style={{ width: '10%' }}>{t('purchaseOrder.fields.quantity')}</th>
              <th style={{ width: '12%' }}>{t('purchaseOrder.fields.unit')}</th>
              <th style={{ width: '15%' }}>{t('purchaseOrder.fields.unitPrice')}</th>
              <th style={{ width: '15%', textAlign: 'right' }}>{t('purchaseOrder.fields.total')}</th>
              <th style={{ width: '8%' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    className="input"
                    value={item.description}
                    onChange={e => setItem(idx, 'description', e.target.value)}
                    placeholder={t('purchaseOrder.fields.itemDescriptionPlaceholder')}
                    style={{ width: '100%' }}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    type="number"
                    min="0.001"
                    step="0.01"
                    value={item.quantity}
                    onChange={e => setItem(idx, 'quantity', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </td>
                <td>
                  <select
                    className="input"
                    value={item.unit}
                    onChange={e => setItem(idx, 'unit', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={e => setItem(idx, 'unitPrice', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>
                  {formatKc(calcItemTotal(item))}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="btn btn--sm"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                    style={{ border: 'none', padding: 4, color: 'var(--danger)' }}
                    title={t('purchaseOrder.removeItem')}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button size="sm" icon={<Plus size={14} />} onClick={addItem}>
          {t('purchaseOrder.addItem')}
        </Button>
      </FormSection>

      {/* Summary */}
      <FormSection title={t('purchaseOrder.sections.summary')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 400 }}>
          <FormField label={t('purchaseOrder.fields.vatRate')} name="vatRate" required={false}>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={form.vatRate}
              onChange={e => set('vatRate', e.target.value)}
            />
          </FormField>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, fontSize: '0.92rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t('purchaseOrder.summaryBase')}</span>
            <span style={{ fontWeight: 500 }}>{formatKc(amountBase)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t('purchaseOrder.summaryVat', { rate: vatRate })}</span>
            <span style={{ fontWeight: 500 }}>{formatKc(vatAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: 8, fontSize: '1.05rem' }}>
            <span style={{ fontWeight: 600 }}>{t('purchaseOrder.summaryTotal')}</span>
            <span style={{ fontWeight: 700 }}>{formatKc(amountTotal)}</span>
          </div>
        </div>
      </FormSection>
    </Modal>
  );
}
