import { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { integrationsApi } from '../../integrations/api/integrations.api';
import { Modal, Button } from '../../../shared/components';
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

  // Initialize lines from existing invoice
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
    amountBase: invoice?.amountBase?.toString() || '',
    vatRate: invoice?.vatRate?.toString() || '0',
    vatAmount: invoice?.vatAmount?.toString() || '',
    amountTotal: invoice?.amountTotal?.toString() || '',
    issueDate: invoice?.issueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    duzp: invoice?.duzp?.slice(0, 10) || '',
    dueDate: invoice?.dueDate?.slice(0, 10) || '',
    variableSymbol: invoice?.variableSymbol || '',
    constantSymbol: invoice?.constantSymbol || '',
    specificSymbol: invoice?.specificSymbol || '',
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

  // When lines change, auto-sync totals
  const handleLinesChange = (newLines: LineItem[]) => {
    setLines(newLines);
    if (newLines.length > 0) {
      const totals = newLines.reduce((acc, l) => {
        const c = calcLine(l);
        return { base: acc.base + c.base, vat: acc.vat + c.vat, total: acc.total + c.total };
      }, { base: 0, vat: 0, total: 0 });
      setForm(f => ({
        ...f,
        amountBase: String(totals.base),
        vatAmount: String(totals.vat),
        amountTotal: String(totals.total),
        vatRate: '0', // mixed rates
      }));
    }
  };

  const recalcVat = (base: string, rate: string) => {
    const b = parseFloat(base) || 0;
    const r = parseInt(rate) || 0;
    const vat = Math.round(b * r / 100);
    setForm(f => ({ ...f, amountBase: base, vatRate: rate, vatAmount: String(vat), amountTotal: String(b + vat) }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.number.trim()) errs.number = 'Povinné';
    if ((!form.amountBase || Number(form.amountBase) <= 0) && lines.length === 0) errs.amountBase = 'Zadejte částku nebo přidejte položky';
    if (!form.issueDate) errs.issueDate = 'Povinné';
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
      amountBase: Number(form.amountBase) || 0,
      vatRate: Number(form.vatRate) || 0,
      vatAmount: Number(form.vatAmount) || 0,
      amountTotal: Number(form.amountTotal) || Number(form.amountBase) || 0,
      issueDate: form.issueDate,
      duzp: form.duzp || undefined,
      dueDate: form.dueDate || undefined,
      variableSymbol: form.variableSymbol || undefined,
      constantSymbol: form.constantSymbol || undefined,
      specificSymbol: form.specificSymbol || undefined,
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

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit doklad' : 'Nový doklad'} wide
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} data-testid="finance-doklad-form-cancel">Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending} data-testid="finance-doklad-form-save">
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }>

      {/* Row 1: number + type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Číslo dokladu *</label>
          <input data-testid="finance-doklad-form-number" value={form.number} onChange={e => set('number', e.target.value)} style={inputStyle('number')} />
          {errors.number && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.number}</div>}
        </div>
        <div>
          <label className="form-label">Typ</label>
          <select data-testid="finance-doklad-form-type" value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle()}>
            {Object.entries(INVOICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: supplier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className="form-label" style={{ margin: 0, fontWeight: 600 }}>Dodavatel</span>
        <button type="button" onClick={() => setShowContactPicker('supplier')}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--accent)', fontSize: '0.78rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={12} /> Z adresáře
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Název</label>
          <input value={form.supplierName} onChange={e => set('supplierName', e.target.value)} style={inputStyle()} placeholder="Název firmy" />
        </div>
        <div>
          <label className="form-label">IČO</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input value={form.supplierIco} onChange={e => set('supplierIco', e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
            <button type="button" onClick={() => handleAresLookup('supplier')} disabled={aresLoading === 'supplier'}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              <Search size={11} /> {aresLoading === 'supplier' ? '...' : 'ARES'}
            </button>
          </div>
          {aresError.supplier && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 2 }}>{aresError.supplier}</div>}
          {aresDefunct.supplier && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 2 }}>Zaniklý subjekt ({aresDefunct.supplier})</div>}
        </div>
        <div>
          <label className="form-label">DIČ</label>
          <input value={form.supplierDic} onChange={e => set('supplierDic', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {/* Row 3: buyer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className="form-label" style={{ margin: 0, fontWeight: 600 }}>Odběratel</span>
        <button type="button" onClick={() => setShowContactPicker('buyer')}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--accent)', fontSize: '0.78rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={12} /> Z adresáře
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Název</label>
          <input value={form.buyerName} onChange={e => set('buyerName', e.target.value)} style={inputStyle()} placeholder="Název firmy" />
        </div>
        <div>
          <label className="form-label">IČO</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input value={form.buyerIco} onChange={e => set('buyerIco', e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
            <button type="button" onClick={() => handleAresLookup('buyer')} disabled={aresLoading === 'buyer'}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              <Search size={11} /> {aresLoading === 'buyer' ? '...' : 'ARES'}
            </button>
          </div>
          {aresError.buyer && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 2 }}>{aresError.buyer}</div>}
          {aresDefunct.buyer && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 2 }}>Zaniklý subjekt ({aresDefunct.buyer})</div>}
        </div>
        <div>
          <label className="form-label">DIČ</label>
          <input value={form.buyerDic} onChange={e => set('buyerDic', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {/* Row 4: description */}
      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} style={inputStyle()} placeholder="Co je fakturováno..." />
      </div>

      {/* Row 4.5: Invoice lines */}
      <InvoiceLinesEditor lines={lines} onChange={handleLinesChange} />

      {/* Row 5: amounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Základ (Kč) *</label>
          <input data-testid="finance-doklad-form-amount" type="number" value={form.amountBase} onChange={e => recalcVat(e.target.value, form.vatRate)} style={inputStyle('amountBase')} placeholder="0" />
          {errors.amountBase && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.amountBase}</div>}
        </div>
        <div>
          <label className="form-label">DPH sazba</label>
          <select value={form.vatRate} onChange={e => recalcVat(form.amountBase, e.target.value)} style={inputStyle()}>
            <option value="0">0%</option>
            <option value="12">12%</option>
            <option value="21">21%</option>
          </select>
        </div>
        <div>
          <label className="form-label">DPH (Kč)</label>
          <input type="number" value={form.vatAmount} onChange={e => set('vatAmount', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Celkem s DPH</label>
          <input type="number" value={form.amountTotal} onChange={e => set('amountTotal', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {/* Row 6: dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Datum vystavení *</label>
          <input data-testid="finance-doklad-form-issueDate" type="date" value={form.issueDate} onChange={e => set('issueDate', e.target.value)} style={inputStyle('issueDate')} />
          {errors.issueDate && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.issueDate}</div>}
        </div>
        <div>
          <label className="form-label">DÚZP</label>
          <input type="date" value={form.duzp} onChange={e => set('duzp', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Splatnost</label>
          <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Variabilní symbol</label>
          <input value={form.variableSymbol} onChange={e => set('variableSymbol', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Konstantní symbol</label>
          <input value={form.constantSymbol} onChange={e => set('constantSymbol', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Specifický symbol</label>
          <input value={form.specificSymbol} onChange={e => set('specificSymbol', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {/* Row 7: transaction link + paid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Propojit s transakcí</label>
          <select value={form.transactionId} onChange={e => set('transactionId', e.target.value)} style={inputStyle()}>
            <option value="">— Žádná —</option>
            {transactions.map(t => (
              <option key={t.id} value={t.id}>{formatCzDate(t.datum)} | {t.popis} | {formatKc(t.castka)}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isPaid} onChange={e => set('isPaid', e.target.checked)}
              style={{ accentColor: 'var(--accent)' }} />
            Uhrazeno
          </label>
        </div>
      </div>

      {/* Row 8: note */}
      <div>
        <label className="form-label">Poznámka</label>
        <textarea value={form.note} onChange={e => set('note', e.target.value)} style={{ ...inputStyle(), minHeight: 50 }} />
      </div>

      {(createMut.isError || updateMut.isError) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>Nepodařilo se uložit doklad.</div>
      )}

      {/* Contact picker modal */}
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
