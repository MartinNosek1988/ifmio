import { useMemo } from 'react';
import { Upload } from 'lucide-react';
import { SearchBar, Table, Badge } from '../../../shared/components';
import type { Column } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { FinTransaction, FinAccount } from '../types';

const TX_TYPE_LABELS: Record<string, string> = {
  credit: 'Příjem', debit: 'Výdaj',
};

export function BankTab({ transactions, accounts, search, onSearch, importRef, importUctId, setImportUctId, importMsg, setImportMsg, onImport, onSelectTx, filterType, onFilterType, onDelete }: {
  transactions: FinTransaction[];
  accounts: FinAccount[];
  search: string;
  onSearch: (q: string) => void;
  importRef: React.RefObject<HTMLInputElement | null>;
  importUctId: string;
  setImportUctId: (v: string) => void;
  importMsg: string | null;
  setImportMsg: (v: string | null) => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectTx: (tx: FinTransaction) => void;
  filterType: string;
  onFilterType: (v: string) => void;
  onDelete: (tx: FinTransaction) => void;
}) {
  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => b.datum.localeCompare(a.datum));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => (t.popis || '').toLowerCase().includes(q) || (t.vs || '').includes(q));
    }
    return list;
  }, [transactions, search]);

  const selectStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  };

  const columns: Column<FinTransaction>[] = [
    { key: 'datum', label: 'Datum', render: t => <span className="text-muted text-sm">{formatCzDate(t.datum)}</span> },
    { key: 'popis', label: 'Popis', render: t => <span style={{ fontWeight: 500 }}>{t.popis}</span> },
    { key: 'vs', label: 'VS', render: t => <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{t.vs || '—'}</span> },
    { key: 'protiUcet', label: 'Protiúčet', render: t => <span className="text-muted text-sm" style={{ fontFamily: 'monospace' }}>{t.protiUcet || '—'}</span> },
    { key: 'castka', label: 'Částka', align: 'right', render: t => (
      <span style={{ fontWeight: 600, color: t.typ === 'prijem' ? 'var(--success)' : 'var(--danger)' }}>
        {t.typ === 'prijem' ? '+' : '-'}{formatKc(t.castka)}
      </span>
    )},
    { key: 'parovani', label: 'Párování', render: t => (
      (t.parovani || []).length > 0
        ? <Badge variant="green">Spárováno</Badge>
        : t.typ === 'prijem' ? <Badge variant="yellow">Nespárováno</Badge> : <Badge variant="muted">Výdej</Badge>
    )},
    { key: 'actions', label: '', render: t => (
      <button onClick={(e) => { e.stopPropagation(); onDelete(t); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem' }}>
        Smazat
      </button>
    )},
  ];

  return (
    <div>
      {/* Import panel */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>Import bankovního výpisu</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={importUctId} onChange={e => setImportUctId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="">-- Vyber účet --</option>
            {accounts.map(u => <option key={u.id} value={u.id}>{u.nazev} ({u.cislo})</option>)}
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: importUctId ? 'pointer' : 'not-allowed', background: 'var(--surface)', color: 'var(--text)', opacity: importUctId ? 1 : 0.5 }}>
            <Upload size={15} /> Nahrát soubor (CSV / ABO)
            <input ref={importRef} type="file" accept=".csv,.txt,.abo,.gpc" onChange={onImport} disabled={!importUctId} style={{ display: 'none' }} />
          </label>
        </div>
        {importMsg && (
          <div style={{ marginTop: 8, fontSize: '0.85rem', padding: '6px 10px', borderRadius: 4, background: 'var(--surface)' }}>
            {importMsg}
            <button onClick={() => setImportMsg(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>x</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat transakce..." onSearch={onSearch} /></div>
        <select value={filterType} onChange={(e) => onFilterType(e.target.value)} style={selectStyle}>
          <option value="">Všechny typy</option>
          {Object.entries(TX_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Table data={filtered} columns={columns} rowKey={t => t.id} onRowClick={onSelectTx} emptyText="Žádné transakce. Importuj bankovní výpis." />
    </div>
  );
}
