import { useState } from 'react';
import React from 'react';
import { Modal, Button } from '../../../shared/components';
import { formatKc } from '../../../shared/utils/format';
import type { ApiInvoice } from '../api/finance.api';
import { PAYMENT_METHODS } from './InvoiceDetailModal';

export function PaymentModal({ invoice, onClose, onSubmit }: {
  invoice: ApiInvoice;
  onClose: () => void;
  onSubmit: (dto: { paidAt: string; paymentMethod: string; paidAmount: number; note?: string }) => void;
}) {
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paidAmount, setPaidAmount] = useState(String(invoice.amountTotal));
  const [note, setNote] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.9rem',
  };

  return (
    <Modal open onClose={onClose} title="Zaznamenat úhradu"
      subtitle={`Doklad ${invoice.number} — ${formatKc(invoice.amountTotal)}`}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={() => onSubmit({ paidAt, paymentMethod, paidAmount: parseFloat(paidAmount) || 0, note: note || undefined })}>
            Zaznamenat úhradu
          </Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Datum úhrady</label>
          <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Způsob platby</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputStyle}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Uhrazená částka (Kč)</label>
          <input type="number" step="0.01" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} style={inputStyle} />
          {parseFloat(paidAmount) < invoice.amountTotal && parseFloat(paidAmount) > 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-orange)', marginTop: 4 }}>
              Částečná úhrada — doklad zůstane jako neuhrazený
            </div>
          )}
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Poznámka</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Volitelná poznámka..." style={inputStyle} />
        </div>
      </div>
    </Modal>
  );
}
