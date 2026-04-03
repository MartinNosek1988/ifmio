import { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { integrationsApi } from '../../integrations/api/integrations.api';
import { Modal } from '../../../shared/components';
import { FormSection, FormFooter } from '../../../shared/components/FormSection';
import { FormField } from '../../../shared/components/FormField';
import { CurrencyInput } from '../../../shared/components/CurrencyInput';
import { CurrencyDisplay } from '../../../shared/components/CurrencyDisplay';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { ApiInvoice } from '../api/finance.api';
import type { FinTransaction } from '../types';
import { useCreateInvoice, useUpdateInvoice } from '../api/finance.queries';
import { InvoiceLinesEditor, calcLine } from './InvoiceLinesEditor';
import type { LineItem } from './InvoiceLinesEditor';
import { ContactPickerModal } from './ContactPickerModal';
import { INVOICE_TYPE_LABELS } from './DokladyTab';

export function InvoiceForm({ invoice, transactions, onClose }: {
  invoice: ApiInvoice | null;
  transactions: FinTransaction[];
  onClose: () => void;
}) {
  const createMut = useCreateInvoice();
  const updateMut = useUpdateInvoice();
  const isEdit = !!invoice;
  const [showContactPicker, setShowContactPicker] = useState<'supplier' | 'buyer' | null>(null);

  const initLines = (): LineItem[] => {
    if (invoice?.lines && invoice.lines.length > 0) {
      return invoice.lines.map(l => ({
        description: l.description || '',
        quantity: String(l.quantity ?? 1),
        unit: l.unit || 'ks',
        unitPrice: String(l.unitPrice ?? 0),
        vatRate: String(l.vatRate ?? 21),
      }));
    }
    return [];
  };
  const [lines, setLines] = useState<LineItem[]>(initLines);

  const [form, setForm] = useState({
    number: invoice?.number || `FAK-${new Date().getFullYear()}-`,
    type: invoice?.type || 'received',
    supplierName: invoice?.supplierName || '',
    supplierIco: invoice?.supplierIco || '',
    supplierDic: invoice?.supplierDic || '',
    buyerName: invoice?.buyerName || '',
    buyerIco: invoice?.buyerIco || '',
    buyerDic: invoice?.buyerDic || '',
    description: invoice?.description || '',
    amountBase: invoice?.amountBase != null ? Number(invoice.amountBase) : null,
    vatRate: invoice?.vatRate?.toString() || '0',
    vatAmount: invoice?.vatAmount != null ? Number(invoice.vatAmount) : null,
    amountTotal: invoice?.amountTotal != null ? Number(invoice.amountTotal) : null,
    issueDate: invoice?.issueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    duzp: invoice?.duzp?.slice(0, 10) || '',
    dueDate: invoice?.dueDate?.slice(0, 10) || '',
    variableSymbol: invoice?.variableSymbol || '',
    constantSymbol: invoice?.constantSymbol || '',
    specificSymbol: invoice?.specificSymbol || '',
    paymentIban: invoice?.paymentIban || '',
    transactionId: invoice?.transactionId || '',
    note: invoice?.note || '',
    isPaid: invoice?.isPaid || false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aresLoading, setAresLoading] = useState<'supplier' | 'buyer' | null>(null);
  const [aresError, setAresError] = useState<Record<string, string>>({});
  const [aresDefunct, setAresDefunct] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleAresLookup = async (prefix: 'supplier' | 'buyer') => {
    const ico = form[`${prefix}Ico` as keyof typeof form] as string;
    if (!ico || ico.length < 8) { setAresError(e => ({ ...e, [prefix]: 'Zadejte platné IČ (8 číslic)' })); return; }
    setAresLoading(prefix); setAresError(e => ({ ...e, [prefix]: '' })); setAresDefunct(d => ({ ...d, [prefix]: '' }));
    try {
      const data = await integrationsApi.ares.lookupByIco(ico);
      if (data) {
        setForm(f => ({
          ...f,
          [`${prefix}Name`]: data.nazev || f[`${prefix}Name` as keyof typeof f],
          [`${prefix}Dic`]: data.dic || f[`${prefix}Dic` as keyof typeof f],
        }));
        if (data.datumZaniku) setAresDefunct(d => ({ ...d, [prefix]: data.datumZaniku! }));
      } else {
        setAresError(e => ({ ...e, [prefix]: 'IČ nenalezeno v ARES' }));
      }
    } catch { setAresError(e => ({ ...e, [prefix]: 'Chyba při ověřování v ARES' })); }
    finally { setAresLoading(null); }
  };

  const handleLinesChange = (newLines: LineItem[]) => {
    setLines(newLines);
    if (newLines.length > 0) {
      const totals = newLines.reduce((acc, l) => {
        const c = calcLine(l);
        return { base: acc.base + c.base, vat: acc.vat + c.vat, total: acc.total + c.total };
      }, { base: 0, vat: 0, total: 0 });
      setForm(f => ({ ...f, amountBase: totals.base, vatAmount: totals.vat, amountTotal: totals.total, vatRate: '0' }));
    }
  };

  const recalcVat = (base: number | null, rate: string) => {
    const b = base ?? 0;
    const r = parseInt(rate) || 0;
    const vat = Math.round(b * r / 100 * 100) / 100;
    setForm(f => ({ ...f, amountBase: base, vatRate: rate, vatAmount: vat, amountTotal: b + vat }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.number.trim()) errs.number = 'Číslo dokladu je povinné';
    if ((!form.amountBase || form.amountBase <= 0) && lines.length === 0) errs.amountBase = 'Zadejte částku nebo přidejte položky';
    if (!form.issueDate) errs.issueDate = 'Datum vystavení je povinné';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const dto = {
      number: form.number,
      type: form.type,
      supplierName: form.supplierName || undefined,
      supplierIco: form.supplierIco || undefined,
      supplierDic: form.supplierDic || undefined,
      buyerName: form.buyerName || undefined,
      buyerIco: form.buyerIco || undefined,
      buyerDic: form.buyerDic || undefined,
      description: form.description || undefined,
      amountBase: form.amountBase ?? 0,
      vatRate: Number(form.vatRate) || 0,
      vatAmount: form.vatAmount ?? 0,
      amountTotal: form.amountTotal ?? form.amountBase ?? 0,
      issueDate: form.issueDate,
      duzp: form.duzp || undefined,
      dueDate: form.dueDate || undefined,
      variableSymbol: form.variableSymbol || undefined,
      constantSymbol: form.constantSymbol || undefined,
      specificSymbol: form.specificSymbol || undefined,
      paymentIban: form.paymentIban || undefined,
      transactionId: form.transactionId || undefined,
      note: form.note || undefined,
      isPaid: form.isPaid,
      lines: lines.length > 0 ? lines.map(l => {
        const c = calcLine(l);
        return {
          description: l.description, quantity: parseFloat(l.quantity) || 1,
          unit: l.unit, unitPrice: parseFloat(l.unitPrice) || 0,
          lineTotal: c.base, vatRate: parseInt(l.vatRate) || 0, vatAmount: c.vat,
        };
      }) : undefined,
    };
    if (isEdit) {
      updateMut.mutate({ id: invoice!.id, dto }, { onSuccess: () => onClose() });
    } else {
      createMut.mutate(dto, { onSuccess: () => onClose() });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  const inputStyle = (field?: string) => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  const monoStyle = (field?: string) => ({ ...inputStyle(field), fontFamily: 'var(--font-mono, monospace)' });

  const partySection = (prefix: 'supplier' | 'buyer', label: string) => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className="form-label" style={{ margin: 0, fontWeight: 600 }}>{label}</span>
        <button type="button" onClick={() => setShowContactPicker(prefix)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--accent)', fontSize: '0.78rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={12} /> Z adresáře
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
        <FormField label="Název" name={`${prefix}Name`} required={false}>
          <input value={form[`${prefix}Name` as keyof typeof form] as string} onChange={e => set(`${prefix}Name`, e.target.value)} style={inputStyle()} placeholder="Název firmy" />
        </FormField>
        <div>
          <FormField label="IČO" name={`${prefix}Ico`} required={false}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input value={form[`${prefix}Ico` as keyof typeof form] as string} onChange={e => set(`${prefix}Ico`, e.target.value)} style={{ ...monoStyle(), flex: 1 }} />
              <button type="button" onClick={() => handleAresLookup(prefix)} disabled={aresLoading === prefix}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                <Search size={11} /> {aresLoading === prefix ? '...' : 'ARES'}
              </button>
            </div>
          </FormField>
          {aresError[prefix] && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: -8, marginBottom: 4 }}>{aresError[prefix]}</div>}
          {aresDefunct[prefix] && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: -8, marginBottom: 4 }}>Zaniklý subjekt ({aresDefunct[prefix]})</div>}
        </div>
        <FormField label="DIČ" name={`${prefix}Dic`} required={false}>
          <input value={form[`${prefix}Dic` as keyof typeof form] as string} onChange={e => set(`${prefix}Dic`, e.target.value)} style={monoStyle()} />
        </FormField>
      </div>
    </>
  );

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit doklad' : 'Nový doklad'} wide
      footer={<FormFooter onCancel={onClose} onSubmit={handleSubmit} isSubmitting={isPending} submitLabel={isEdit ? 'Uložit' : 'Vytvořit'} data-testid-save="finance-doklad-form-save" data-testid-cancel="finance-doklad-form-cancel" />}>

      {/* ── Sekce 1: Identifikace (vždy otevřená) ─────────────── */}
      <FormSection title="Identifikace dokladu" collapsible={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Číslo dokladu" name="number" error={errors.number}>
            <input data-testid="finance-doklad-form-number" value={form.number} onChange={e => set('number', e.target.value)} style={monoStyle('number')} />
          </FormField>
          <FormField label="Typ" name="type">
            <select data-testid="finance-doklad-form-type" value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle()}>
              {Object.entries(INVOICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
        </div>

        {partySection('supplier', 'Dodavatel')}
        <div style={{ marginTop: 8 }} />
        {partySection('buyer', 'Odběratel')}

        <FormField label="Popis" name="description" required={false}>
          <input value={form.description} onChange={e => set('description', e.target.value)} style={inputStyle()} placeholder="Co je fakturováno..." />
        </FormField>
      </FormSection>

      {/* ── Sekce 2: Položky a částky (vždy otevřená) ─────────── */}
      <FormSection title="Položky a částky" collapsible={false}>
        <InvoiceLinesEditor lines={lines} onChange={handleLinesChange} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 8 }}>
          <div>
            <CurrencyInput
              label="Základ (Kč)"
              value={form.amountBase}
              onChange={(v) => recalcVat(v, form.vatRate)}
              error={errors.amountBase}
              required
              name="amountBase"
              data-testid="finance-doklad-form-amount"
            />
          </div>
          <FormField label="DPH sazba" name="vatRate">
            <select value={form.vatRate} onChange={e => recalcVat(form.amountBase, e.target.value)} style={inputStyle()}>
              <option value="0">0%</option>
              <option value="12">12%</option>
              <option value="21">21%</option>
            </select>
          </FormField>
          <FormField label="DPH (Kč)" name="vatAmount" computed computedSource="základ × sazba">
            <div style={{ padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'right' }}>
              <CurrencyDisplay amount={form.vatAmount ?? 0} colorize={false} size="sm" />
            </div>
          </FormField>
          <FormField label="Celkem s DPH" name="amountTotal" computed computedSource="základ + DPH">
            <div style={{ padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'right' }}>
              <CurrencyDisplay amount={form.amountTotal ?? 0} colorize={false} size="sm" />
            </div>
          </FormField>
        </div>
      </FormSection>

      {/* ── Sekce 3: Datumy a symboly (collapsible) ──────────── */}
      <FormSection title="Datumy a platební symboly" defaultExpanded={isEdit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FormField label="Datum vystavení" name="issueDate" error={errors.issueDate}>
            <input data-testid="finance-doklad-form-issueDate" type="date" value={form.issueDate} onChange={e => set('issueDate', e.target.value)} style={inputStyle('issueDate')} />
          </FormField>
          <FormField label="DÚZP" name="duzp" required={false}>
            <input type="date" value={form.duzp} onChange={e => set('duzp', e.target.value)} style={inputStyle()} />
          </FormField>
          <FormField label="Splatnost" name="dueDate" required={false}>
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} style={inputStyle()} />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <FormField label="Variabilní symbol" name="variableSymbol" required={false}>
            <input value={form.variableSymbol} onChange={e => set('variableSymbol', e.target.value)} style={monoStyle()} />
          </FormField>
          <FormField label="Konstantní symbol" name="constantSymbol" required={false}>
            <input value={form.constantSymbol} onChange={e => set('constantSymbol', e.target.value)} style={monoStyle()} />
          </FormField>
          <FormField label="Specifický symbol" name="specificSymbol" required={false}>
            <input value={form.specificSymbol} onChange={e => set('specificSymbol', e.target.value)} style={monoStyle()} />
          </FormField>
        </div>
        <FormField label="IBAN pro platbu" name="paymentIban" required={false} helpText="IBAN účtu příjemce pro generování QR platby">
          <input value={form.paymentIban} onChange={e => set('paymentIban', e.target.value)} style={monoStyle()} placeholder="CZ74 5500 0000 0002 0218 8785" />
        </FormField>
      </FormSection>

      {/* ── Sekce 4: Poznámky a stav (collapsed) ─────────────── */}
      <FormSection title="Ostatní" defaultExpanded={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <FormField label="Propojit s transakcí" name="transactionId" required={false}>
            <select value={form.transactionId} onChange={e => set('transactionId', e.target.value)} style={inputStyle()}>
              <option value="">— Žádná —</option>
              {transactions.map(t => (
                <option key={t.id} value={t.id}>{formatCzDate(t.datum)} | {t.popis} | {formatKc(t.castka)}</option>
              ))}
            </select>
          </FormField>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isPaid} onChange={e => set('isPaid', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
              Uhrazeno
            </label>
          </div>
        </div>
        <FormField label="Poznámka" name="note" required={false}>
          <textarea value={form.note} onChange={e => set('note', e.target.value)} style={{ ...inputStyle(), minHeight: 50 }} />
        </FormField>
      </FormSection>

      {(createMut.isError || updateMut.isError) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>Nepodařilo se uložit doklad.</div>
      )}

      {showContactPicker && (
        <ContactPickerModal
          onClose={() => setShowContactPicker(null)}
          onSelect={(contact) => {
            const prefix = showContactPicker === 'supplier' ? 'supplier' : 'buyer';
            setForm(f => ({
              ...f,
              [`${prefix}Name`]: `${contact.firstName} ${contact.lastName}`.trim(),
              [`${prefix}Ico`]: '',
              [`${prefix}Dic`]: '',
            }));
            setShowContactPicker(null);
          }}
        />
      )}
    </Modal>
  );
}
