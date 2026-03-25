import { useMemo, useState } from 'react';
import { Upload, Zap, CheckCircle2, Download, Scissors } from 'lucide-react';
import { SplitTransactionModal } from './SplitTransactionModal';
import { SearchBar, Table, Badge, Button, Modal } from '../../../shared/components';
import type { Column } from '../../../shared/components';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import type { FinTransaction, FinAccount } from '../types';
import type { AutoMatchResponse } from '../api/finance.api';

const TX_TYPE_LABELS: Record<string, string> = {
  credit: 'Příjem', debit: 'Výdaj',
};

const MATCH_TARGET_LABELS: Record<string, string> = {
  KONTO: 'Konto',
  INVOICE: 'Doklad',
  COMPONENT: 'Složka',
  NO_EFFECT: 'Bez vlivu',
  UNSPECIFIED: 'Neuvedeno',
};

const MATCH_FILTER_OPTIONS = [
  { value: '', label: 'Všechny stavy' },
  { value: 'unmatched', label: 'Nespárované' },
  { value: 'matched', label: 'Spárované' },
  { value: 'partially_matched', label: 'Částečné' },
  { value: 'no_effect', label: 'Bez vlivu' },
];

function MatchStatusBadge({ tx }: { tx: FinTransaction }) {
  if (tx.status === 'matched') {
    if (tx.matchTarget === 'NO_EFFECT') return <Badge variant="muted">Bez vlivu</Badge>;
    return <Badge variant="green">Spárováno</Badge>;
  }
  if (tx.status === 'partially_matched') return <Badge variant="yellow">Částečné</Badge>;
  if (tx.status === 'ignored') return <Badge variant="muted">Ignorováno</Badge>;
  if (tx.typ === 'prijem') return <Badge variant="red">Nespárováno</Badge>;
  return <Badge variant="muted">Výdej</Badge>;
}

function MatchTargetLabel({ tx }: { tx: FinTransaction }) {
  if (!tx.matchTarget) return <span className="text-muted">—</span>;
  return <span className="text-sm">{MATCH_TARGET_LABELS[tx.matchTarget] || tx.matchTarget}</span>;
}

interface Props {
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
  dateFrom: string;
  onDateFrom: (v: string) => void;
  dateTo: string;
  onDateTo: (v: string) => void;
  onDelete: (tx: FinTransaction) => void;
  onAutoMatch?: () => void;
  onMatchAll?: () => void;
  autoMatchResult?: AutoMatchResponse | null;
  onDismissAutoResult?: () => void;
  isAutoMatching?: boolean;
  isMatchingAll?: boolean;
}

export function BankTab({
  transactions, accounts, search, onSearch, importRef, importUctId,
  setImportUctId, importMsg, setImportMsg, onImport, onSelectTx,
  filterType, onFilterType, dateFrom, onDateFrom, dateTo, onDateTo,
  onDelete, onAutoMatch, onMatchAll,
  autoMatchResult, onDismissAutoResult, isAutoMatching, isMatchingAll,
}: Props) {
  const [filterMatch, setFilterMatch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [splitTx, setSplitTx] = useState<FinTransaction | null>(null);
  const [showStatement, setShowStatement] = useState(false);
  const [stmtFrom, setStmtFrom] = useState('');
  const [stmtTo, setStmtTo] = useState(new Date().toISOString().slice(0, 10));
  const [stmtLoading, setStmtLoading] = useState(false);

  const handleExport = async (fmt: 'csv' | 'xlsx') => {
    setExporting(true)
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1'
      const token = sessionStorage.getItem('ifmio:access_token')
      const params = new URLSearchParams()
      params.set('format', fmt)
      if (filterType) params.set('type', filterType)
      if (filterMatch) params.set('status', filterMatch)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`${baseUrl}/finance/transactions/export?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `transakce.${fmt}`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch { /* toast could be added here */ }
    finally { setExporting(false) }
  };

  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => b.datum.localeCompare(a.datum));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => (t.popis || '').toLowerCase().includes(q) || (t.vs || '').includes(q));
    }
    if (filterMatch) {
      if (filterMatch === 'no_effect') {
        list = list.filter(t => t.matchTarget === 'NO_EFFECT');
      } else {
        list = list.filter(t => t.status === filterMatch);
      }
    }
    return list;
  }, [transactions, search, filterMatch]);

  const selectStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  };

  const columns: Column<FinTransaction>[] = [
    { key: 'datum', label: 'Datum', render: t => <span className="text-muted text-sm">{formatCzDate(t.datum)}</span> },
    { key: 'popis', label: 'Popis', render: t => (
      <div>
        <span style={{ fontWeight: 500 }}>{t.popis}</span>
        {t.splitParentId && <span className="text-muted text-sm" style={{ marginLeft: 4 }}>(rozděleno)</span>}
      </div>
    )},
    { key: 'vs', label: 'VS', render: t => <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{t.vs || '—'}</span> },
    { key: 'protiUcet', label: 'Protiúčet', render: t => <span className="text-muted text-sm" style={{ fontFamily: 'monospace' }}>{t.protiUcet || '—'}</span> },
    { key: 'castka', label: 'Částka', align: 'right', render: t => (
      <span style={{ fontWeight: 600, color: t.typ === 'prijem' ? 'var(--success)' : 'var(--danger)' }}>
        {t.typ === 'prijem' ? '+' : '-'}{formatKc(t.castka)}
      </span>
    )},
    { key: 'matchStatus', label: 'Stav', render: t => <MatchStatusBadge tx={t} /> },
    { key: 'matchTarget', label: 'Cíl', render: t => <MatchTargetLabel tx={t} /> },
    { key: 'matchedWith', label: 'Spárováno s', render: t => {
      if (!t.matchedEntityId) return <span className="text-muted">—</span>;
      if (t.matchTarget === 'NO_EFFECT') return <span className="text-muted text-sm">{t.matchNote || '—'}</span>;
      return <span className="text-sm">{t.prescriptionDesc || t.matchedEntityType || '—'}</span>;
    }},
    { key: 'actions', label: '', render: t => (
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        {t.status !== 'ignored' && !t.splitParentId && (
          <button onClick={() => setSplitTx(t)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary, #3b82f6)', fontSize: '0.78rem' }}
            title="Rozdělit transakci">
            <Scissors size={13} />
          </button>
        )}
        <button onClick={() => onDelete(t)}
          data-testid="finance-tx-delete-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem' }}>
          Smazat
        </button>
      </div>
    )},
  ];

  return (
    <div data-testid="bank-tab">
      {/* Import panel */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>Import bankovního výpisu</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={importUctId} onChange={e => setImportUctId(e.target.value)}
            data-testid="finance-import-account"
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

      {/* Auto-match result banner */}
      {autoMatchResult && (
        <div data-testid="finance-auto-match-result" style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '12px 16px', marginBottom: 16, fontSize: '0.875rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <strong>Auto-párování dokončeno: </strong>
            <span style={{ color: 'var(--success)' }}>{autoMatchResult.matched} spárováno</span>
            {autoMatchResult.unmatched > 0 && (
              <span style={{ color: 'var(--danger)', marginLeft: 8 }}>{autoMatchResult.unmatched} nespárováno</span>
            )}
          </div>
          <button onClick={onDismissAutoResult} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat transakce..." onSearch={onSearch} data-testid="finance-tx-search" /></div>
        <select value={filterType} onChange={(e) => onFilterType(e.target.value)} style={selectStyle} data-testid="finance-tx-filter-type">
          <option value="">Všechny typy</option>
          {Object.entries(TX_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterMatch} onChange={(e) => setFilterMatch(e.target.value)} style={selectStyle} data-testid="finance-tx-filter-status">
          {MATCH_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.82rem', color: 'var(--text-muted)' }}>
          Od
          <input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.82rem', color: 'var(--text-muted)' }}>
          Do
          <input type="date" value={dateTo} onChange={e => onDateTo(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '.84rem' }} />
        </label>
        {(filterMatch || dateFrom || dateTo || filterType) && (
          <button onClick={() => { setFilterMatch(''); onFilterType(''); onDateFrom(''); onDateTo('') }}
            style={{ background: 'none', border: 'none', color: 'var(--primary, #3b82f6)', cursor: 'pointer', fontSize: '.82rem', padding: '8px 0' }}>
            Vymazat filtry
          </button>
        )}
        {onAutoMatch && (
          <Button icon={<Zap size={15} />} onClick={onAutoMatch} disabled={isAutoMatching} data-testid="finance-tx-auto-match-btn">
            {isAutoMatching ? 'Párování...' : 'Auto-párovat'}
          </Button>
        )}
        {onMatchAll && (
          <Button icon={<CheckCircle2 size={15} />} onClick={onMatchAll} disabled={isMatchingAll} data-testid="finance-tx-match-all-btn">
            {isMatchingAll ? 'Zpracovávám...' : 'Spárovat vše'}
          </Button>
        )}
        <Button icon={<Download size={15} />} onClick={() => handleExport('csv')} disabled={exporting}>
          {exporting ? 'Export...' : 'CSV'}
        </Button>
        <Button icon={<Download size={15} />} onClick={() => handleExport('xlsx')} disabled={exporting}>
          XLSX
        </Button>
        {importUctId && (
          <Button icon={<Download size={15} />} onClick={() => setShowStatement(true)}>
            Výpis PDF
          </Button>
        )}
      </div>

      <Table
        data={filtered}
        columns={columns}
        rowKey={t => t.id}
        onRowClick={onSelectTx}
        emptyText="Žádné transakce. Importuj bankovní výpis."
        data-testid="finance-tx-table"
      />

      {splitTx && (
        <SplitTransactionModal
          transaction={splitTx}
          onClose={() => setSplitTx(null)}
          onSuccess={() => { setSplitTx(null); }}
        />
      )}

      {showStatement && (
        <Modal open onClose={() => setShowStatement(false)} title="Bankovní výpis PDF" footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowStatement(false)}>Zrušit</Button>
            <Button variant="primary" disabled={stmtLoading || !stmtFrom} onClick={async () => {
              setStmtLoading(true)
              try {
                const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1'
                const token = sessionStorage.getItem('ifmio:access_token')
                const res = await fetch(`${baseUrl}/finance/bank-accounts/${importUctId}/statement?dateFrom=${stmtFrom}&dateTo=${stmtTo}&format=pdf`, { headers: { Authorization: `Bearer ${token}` } })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const blob = await res.blob()
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = `vypis-${stmtFrom}-${stmtTo}.pdf`
                link.click()
                URL.revokeObjectURL(link.href)
                setShowStatement(false)
              } catch { /* error */ }
              finally { setStmtLoading(false) }
            }}>{stmtLoading ? 'Generuji…' : 'Stáhnout PDF'}</Button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: '.85rem' }}>
              Období od *
              <input type="date" value={stmtFrom} onChange={e => setStmtFrom(e.target.value)} style={{ ...selectStyle, display: 'block', marginTop: 4, width: '100%', fontSize: '.84rem' }} />
            </label>
            <label style={{ fontSize: '.85rem' }}>
              Období do
              <input type="date" value={stmtTo} onChange={e => setStmtTo(e.target.value)} style={{ ...selectStyle, display: 'block', marginTop: 4, width: '100%', fontSize: '.84rem' }} />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
