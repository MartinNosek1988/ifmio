import { useState } from 'react';
import { Download, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, Badge, Button } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { ApiInvoice } from '../api/finance.api';
import type { FinTransaction } from '../types';
import { InvoiceLinesDetail } from './InvoiceLinesDetail';
import { PaymentModal } from './PaymentModal';
import { PairTransactionModal } from './PairTransactionModal';
import { INVOICE_TYPE_LABELS } from './DokladyTab';

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bankovní převod' },
  { value: 'cash', label: 'Hotovost' },
  { value: 'card', label: 'Kartou' },
  { value: 'other', label: 'Jiný' },
];

export function InvoiceDetailModal({ invoice, transactions, onClose, onEdit, onMarkPaid, onPair, onExport, onDelete }: {
  invoice: ApiInvoice;
  transactions: FinTransaction[];
  onClose: () => void;
  onEdit: () => void;
  onMarkPaid: (dto?: { paidAt?: string; paymentMethod?: string; paidAmount?: number; note?: string }) => void;
  onPair: (transactionId: string) => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const navigate = useNavigate();
  const overdue = !invoice.isPaid && invoice.dueDate && invoice.dueDate < new Date().toISOString().slice(0, 10);

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );

  const clickableName = (name: string | undefined, id: string | undefined | null, _type: 'supplier' | 'buyer') => {
    if (!name) return '—';
    if (id) {
      return (
        <span
          style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => { onClose(); navigate(`/residents?detail=${id}`); }}
        >
          {name}
        </span>
      );
    }
    return name;
  };

  return (
    <>
    <Modal open onClose={onClose} title={`Doklad ${invoice.number}`}
      subtitle={
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <Badge variant="blue">{INVOICE_TYPE_LABELS[invoice.type] || invoice.type}</Badge>
          {invoice.isPaid
            ? <Badge variant="green">Uhrazeno</Badge>
            : <Badge variant={overdue ? 'red' : 'yellow'}>{overdue ? 'Po splatnosti' : 'Neuhrazeno'}</Badge>}
          {invoice.isdocXml && <Badge variant="blue">ISDOC</Badge>}
        </div>
      }
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
          <Button variant="danger" onClick={onDelete}>Smazat</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onExport} icon={<Download size={14} />}>Export ISDOC</Button>
            {!invoice.isPaid && !invoice.transactionId && (
              <Button onClick={() => setShowPairModal(true)} icon={<Link2 size={14} />}>Párovat s bankou</Button>
            )}
            {!invoice.isPaid && <Button variant="primary" onClick={() => setShowPaymentModal(true)}>Uhradit</Button>}
            <Button variant="primary" onClick={onEdit}>Upravit</Button>
          </div>
        </div>
      }>

      {/* Amounts section */}
      <div style={{ background: 'var(--surface-2, var(--surface))', borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Základ</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatKc(invoice.amountBase)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>DPH {invoice.vatRate}%</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatKc(invoice.vatAmount)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Celkem</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>{formatKc(invoice.amountTotal)}</div>
          </div>
        </div>
      </div>

      {/* Details */}
      {row('Číslo dokladu', invoice.number)}
      {row('Typ', INVOICE_TYPE_LABELS[invoice.type] || invoice.type)}
      {row('Datum vystavení', formatCzDate(invoice.issueDate))}
      {invoice.duzp && row('DÚZP', formatCzDate(invoice.duzp))}
      {row('Splatnost', invoice.dueDate ? (
        <span style={{ color: overdue ? 'var(--danger)' : undefined, fontWeight: overdue ? 600 : 500 }}>
          {formatCzDate(invoice.dueDate)}
        </span>
      ) : '—')}
      {invoice.paymentDate && row('Datum úhrady', formatCzDate(invoice.paymentDate))}
      {invoice.paymentMethod && row('Způsob úhrady', PAYMENT_METHODS.find(m => m.value === invoice.paymentMethod)?.label || invoice.paymentMethod)}
      {invoice.paidAmount != null && row('Uhrazená částka', formatKc(invoice.paidAmount))}
      {row('Variabilní symbol', invoice.variableSymbol)}
      {row('Měna', invoice.currency || 'CZK')}

      {/* Supplier */}
      {(invoice.supplierName || invoice.supplierIco) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Dodavatel</div>
          {row('Název', clickableName(invoice.supplierName, invoice.supplierId, 'supplier'))}
          {invoice.supplierIco && row('IČO', invoice.supplierIco)}
          {invoice.supplierDic && row('DIČ', invoice.supplierDic)}
        </div>
      )}

      {/* Buyer */}
      {(invoice.buyerName || invoice.buyerIco) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Odběratel</div>
          {row('Název', clickableName(invoice.buyerName, invoice.buyerId, 'buyer'))}
          {invoice.buyerIco && row('IČO', invoice.buyerIco)}
          {invoice.buyerDic && row('DIČ', invoice.buyerDic)}
        </div>
      )}

      {/* Description & note */}
      {invoice.description && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Popis</div>
          <div style={{ fontSize: '0.9rem' }}>{invoice.description}</div>
        </div>
      )}

      {/* Invoice lines */}
      {invoice.lines && invoice.lines.length > 0 && (
        <InvoiceLinesDetail lines={invoice.lines} />
      )}

      {invoice.note && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Poznámka</div>
          <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>{invoice.note}</div>
        </div>
      )}

      {/* Linked transaction */}
      {invoice.transaction && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Propojená transakce</div>
          <div style={{ fontSize: '0.9rem' }}>{invoice.transaction.description} — {formatKc(invoice.transaction.amount)}</div>
        </div>
      )}

      {/* Property */}
      {invoice.property && (
        <div style={{ marginTop: 10 }}>
          {row('Nemovitost', invoice.property.name)}
        </div>
      )}
    </Modal>

    {/* Payment Modal */}
    {showPaymentModal && (
      <PaymentModal
        invoice={invoice}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={(dto) => { setShowPaymentModal(false); onMarkPaid(dto); }}
      />
    )}

    {/* Pair with Bank Modal */}
    {showPairModal && (
      <PairTransactionModal
        invoice={invoice}
        transactions={transactions}
        onClose={() => setShowPairModal(false)}
        onPair={(txId) => { setShowPairModal(false); onPair(txId); }}
      />
    )}
    </>
  );
}
