import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { SearchBar, Button, EmptyState } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { FinTransaction, FinPrescription } from '../types';

export function ParovaniTab({ transactions, prescriptions, onAutoParovat, onParovat, autoResult, getPropName }: {
  transactions: FinTransaction[];
  prescriptions: FinPrescription[];
  onAutoParovat: () => void;
  onParovat: (txId: string, predpisId: string) => void;
  autoResult: string | null;
  getPropName: (id: unknown) => string;
}) {
  const [selectedTx, setSelectedTx] = useState<FinTransaction | null>(null);
  const unmatched = transactions.filter(t => t.typ === 'prijem' && (t.parovani || []).length === 0);
  const openPredpisy = prescriptions.filter(p => p.status !== 'paid');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <Button variant="primary" icon={<Link2 size={15} />} onClick={onAutoParovat}>Spustit auto-párování</Button>
        <span className="text-muted text-sm">Páruje podle variabilního symbolu a částky</span>
      </div>
      {autoResult && (
        <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--surface-2)', fontSize: '0.875rem', marginBottom: 16 }}>
          {autoResult}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: unmatched */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>
            Nespárované transakce ({unmatched.length})
          </div>
          {unmatched.length === 0 && <EmptyState title="Vše spárováno" description="Žádné nespárované příjmy." />}
          {unmatched.map(t => (
            <div key={t.id} onClick={() => setSelectedTx(t)}
              style={{
                padding: 12, border: `2px solid ${selectedTx?.id === t.id ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: 'var(--surface)',
              }}>
              <div style={{ fontWeight: 600 }}>{formatKc(t.castka)}</div>
              <div className="text-muted text-sm">{t.popis}</div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>VS: {t.vs || '—'} | {formatCzDate(t.datum)}</div>
            </div>
          ))}
        </div>
        {/* Right: open prescriptions */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>
            {selectedTx ? `Spáruj s předpisem (${formatKc(selectedTx.castka)})` : 'Vyber transakci vlevo'}
          </div>
          {selectedTx && openPredpisy.map(p => (
            <div key={p.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.popis}</div>
                <div className="text-muted text-sm">{getPropName(p.propId)} | k úhradě: {formatKc(p.kUhrade ?? 0)}</div>
              </div>
              <Button variant="primary" size="sm" onClick={() => { onParovat(selectedTx.id, p.id); setSelectedTx(null); }}>
                Spárovat
              </Button>
            </div>
          ))}
          {selectedTx && openPredpisy.length === 0 && <EmptyState title="Žádné otevřené předpisy" />}
        </div>
      </div>
    </div>
  );
}

export function ParovaniPicker({ prescriptions, onParovat, getPropName }: {
  prescriptions: FinPrescription[];
  onParovat: (predpisId: string) => void;
  getPropName: (id: unknown) => string;
}) {
  const [search, setSearch] = useState('');
  const filtered = prescriptions.filter(p =>
    p.popis.toLowerCase().includes(search.toLowerCase()) || getPropName(p.propId).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <SearchBar placeholder="Hledat předpis..." onSearch={setSearch} />
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {filtered.map(p => (
          <div key={p.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.popis}</div>
              <div className="text-muted text-sm">{getPropName(p.propId)} | k úhradě: {formatKc(p.kUhrade ?? 0)}</div>
            </div>
            <Button variant="primary" size="sm" onClick={() => onParovat(p.id)}>Spárovat</Button>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState title="Žádné otevřené předpisy" />}
      </div>
    </div>
  );
}
