import { useState, useMemo } from 'react';
import { Modal, Badge } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { ApiInvoice } from '../api/finance.api';
import type { FinTransaction } from '../types';

export function PairTransactionModal({ invoice, transactions, onClose, onPair }: {
  invoice: ApiInvoice;
  transactions: FinTransaction[];
  onClose: () => void;
  onPair: (transactionId: string) => void;
}) {
  const [search, setSearch] = useState(invoice.variableSymbol || '');

  // Filter unmatched transactions, prioritize by VS match
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions
      .filter(t => !t.parovani || t.parovani.length === 0)
      .filter(t => {
        if (!q) return true;
        return (
          (t.vs && t.vs.toLowerCase().includes(q)) ||
          (t.protiUcet && t.protiUcet.toLowerCase().includes(q)) ||
          (t.popis && t.popis.toLowerCase().includes(q)) ||
          String(t.castka).includes(q)
        );
      })
      .sort((a, b) => {
        // Prioritize VS match
        const aVs = a.vs === invoice.variableSymbol ? 1 : 0;
        const bVs = b.vs === invoice.variableSymbol ? 1 : 0;
        if (aVs !== bVs) return bVs - aVs;
        // Then by amount match
        const aDiff = Math.abs(a.castka - invoice.amountTotal);
        const bDiff = Math.abs(b.castka - invoice.amountTotal);
        return aDiff - bDiff;
      });
  }, [transactions, search, invoice]);

  return (
    <Modal open onClose={onClose} title="Párovat s bankovní transakcí"
      subtitle={`Doklad ${invoice.number} — ${formatKc(invoice.amountTotal)}`}>
      <div style={{ marginBottom: 12 }}>
        <div className="search-bar">
          <input type="text" placeholder="Hledat dle VS, protistrany, částky..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.88rem' }}
          />
        </div>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Žádné nespárované transakce
          </div>
        ) : (
          filtered.slice(0, 50).map(tx => {
            const isVsMatch = tx.vs && tx.vs === invoice.variableSymbol;
            const isAmountMatch = Math.abs(tx.castka - invoice.amountTotal) < 0.01;
            return (
              <div key={tx.id}
                onClick={() => onPair(tx.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', borderRadius: 4, alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2, rgba(255,255,255,0.05))')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>
                    {tx.protiUcet || tx.popis || 'Transakce'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {formatCzDate(tx.datum)}
                    {tx.vs && <span> · VS: {tx.vs}</span>}
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isAmountMatch ? 'var(--success)' : undefined }}>
                  {formatKc(tx.castka)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {isVsMatch && <Badge variant="green">VS</Badge>}
                  {isAmountMatch && <Badge variant="green">Částka</Badge>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
