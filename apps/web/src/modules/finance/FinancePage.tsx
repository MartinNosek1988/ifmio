import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, Zap, Link2, Calculator, Plus } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState, Modal } from '../../shared/components';
import type { Column } from '../../shared/components';
import { formatKc, formatCzDate } from '../../shared/utils/format';
import { FIN_STATUS_LABELS, label } from '../../constants/labels';
import type { FinTransaction, FinPrescription, FinAccount } from './types';
import { useToast } from '../../shared/components/toast/Toast';
import { useBankAccounts, useTransactions, useImportTransactions, usePrescriptions, useGeneratePrescriptions, useMatchTransactions, useMatchSingle, useFinanceSummary, useDeletePrescription, useDeleteTransaction, useCreatePrescription } from './api/finance.queries';
import { mapAccount, mapTransaction, mapPrescription } from './api/finance.mappers';
import { useProperties } from '../properties/use-properties';
import { useResidents } from '../residents/api/residents.queries';
import { PrescriptionCalc } from './calc/PrescriptionCalc';
import type { ApiProperty } from '../properties/properties-api';

const TABS = [
  { key: 'prescriptions', label: 'Předpisy' },
  { key: 'bank', label: 'Banka' },
  { key: 'parovani', label: 'Párování' },
  { key: 'accounts', label: 'Účty' },
  { key: 'debtors', label: 'Dlužníci' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function FinancePage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') || 'prescriptions') as TabKey;
  // TAB 3+4: match single mutation
  const matchSingleMutation = useMatchSingle();

  // TAB 1: accounts from API
  const { data: apiBankAccounts = [] } = useBankAccounts();
  const accounts = useMemo(() => apiBankAccounts.map(mapAccount), [apiBankAccounts]);

  // TAB 2: transaction type filter (must be declared before useTransactions)
  const [filterTxType, setFilterTxType] = useState('');

  // TAB 2: transactions from API
  const { data: txData } = useTransactions({ page: 1, limit: 500, ...(filterTxType ? { type: filterTxType } : {}) });
  const transactions = useMemo(() => (txData?.data ?? []).map(mapTransaction), [txData]);
  const importMutation = useImportTransactions();

  // TAB 3: prescriptions from API (with type/status filter)
  const [filterPresType, setFilterPresType] = useState('');
  const [filterPresStatus, setFilterPresStatus] = useState('');
  const { data: presData } = usePrescriptions({
    ...(filterPresType ? { type: filterPresType } : {}),
    ...(filterPresStatus ? { status: filterPresStatus } : { status: 'active' }),
    limit: 200,
  });
  const prescriptions = useMemo(() => (presData?.data ?? []).map(mapPrescription), [presData]);
  const generateMutation = useGeneratePrescriptions();

  // TAB 4: matching mutation
  const matchMutation = useMatchTransactions();
  const [search, setSearch] = useState('');

  // Delete mutations
  const deletePrescriptionMutation = useDeletePrescription();
  const deleteTransactionMutation = useDeleteTransaction();
  const [deletePredpis, setDeletePredpis] = useState<FinPrescription | null>(null);
  const [deleteTx, setDeleteTx] = useState<FinTransaction | null>(null);

  // New prescription form
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);

  // Generate modal
  const [showGen, setShowGen] = useState(false);
  const [genPropId, setGenPropId] = useState('');
  const [genMesic, setGenMesic] = useState(new Date().toISOString().slice(0, 7));
  const [genResult, setGenResult] = useState<string | null>(null);

  // Auto-parovani result
  const [autoResult, setAutoResult] = useState<string | null>(null);

  // Detail modal
  const [detailPredpis, setDetailPredpis] = useState<FinPrescription | null>(null);

  // Parovani
  const [parTx, setParTx] = useState<FinTransaction | null>(null);

  // Import
  const importRef = useRef<HTMLInputElement>(null);
  const [importUctId, setImportUctId] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // Calc
  const [showCalc, setShowCalc] = useState(false);

  const { data: summary } = useFinanceSummary();
  const { data: properties = [] } = useProperties();
  const { data: residentsData } = useResidents();
  const residents = residentsData?.data ?? [];

  const getPropName = (propId: unknown) =>
    properties.find(p => String(p.id) === String(propId))?.name || `#${propId}`;

  const getTenantName = (tenantId?: string | null) => {
    if (!tenantId) return '—';
    const r = residents.find(x => String(x.id) === String(tenantId));
    return r ? `${r.firstName} ${r.lastName}` : tenantId;
  };

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleGenerate = () => {
    if (!genPropId || !genMesic) return;
    generateMutation.mutate(
      { propertyId: genPropId, month: genMesic },
      {
        onSuccess: (res: { created?: number; skipped?: number }) => {
          setGenResult(
            (res.created ?? 0) > 0
              ? `Vygenerováno ${res.created} předpisů pro ${genMesic}`
              : `Žádné nové předpisy — buď již existují, nebo nejsou obsazené jednotky`,
          );
        },
        onError: () => setGenResult('Chyba při generování předpisů'),
      },
    );
  };

  const handleAutoParovat = () => {
    matchMutation.mutate(undefined, {
      onSuccess: (res: { matched?: number; total?: number; unmatched?: number }) => {
        setAutoResult(`Spárováno: ${res.matched ?? 0} | Nezpárováno: ${res.unmatched ?? 0}`);
        toast.success(`Spárováno: ${res.matched ?? 0} transakcí`);
      },
      onError: () => {
        setAutoResult('Chyba při párování');
        toast.error('Auto-párování selhalo');
      },
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importUctId) {
      setImportMsg('Vyber nejdřív účet a soubor');
      return;
    }
    importMutation.mutate(
      { bankAccountId: importUctId, file },
      {
        onSuccess: (res: { imported?: number; skipped?: number; total?: number }) => {
          setImportMsg(`Importováno ${res.imported ?? 0} nových, ${res.skipped ?? 0} přeskočeno`);
          toast.success(`Importováno: ${res.imported ?? 0} transakcí`);
        },
        onError: () => {
          setImportMsg('Chyba při importu');
          toast.error('Import selhal');
        },
      },
    );
    if (importRef.current) importRef.current.value = '';
  };

  const handleParovat = (txId: string, predpisId: string) => {
    matchSingleMutation.mutate(
      { transactionId: txId, prescriptionId: predpisId },
      { onSuccess: () => setParTx(null) },
    );
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowPrescriptionForm(true)}>Nový předpis</Button>
          <Button icon={<Calculator size={15} />} onClick={() => setShowCalc(true)}>Kalkulačka</Button>
          <Button icon={<Zap size={15} />} onClick={() => setShowGen(true)}>Generovat předpisy</Button>
          <Button icon={<Link2 size={15} />} onClick={handleAutoParovat}>Auto-párovat</Button>
        </div>
      </div>

      {autoResult && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{autoResult}</span>
          <button onClick={() => setAutoResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>x</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Transakce" value={String(summary?.totalTransactions ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Objem" value={formatKc(summary?.totalVolume ?? 0)} color="var(--accent-green)" />
        <KpiCard label="Nespárované" value={String(summary?.unmatchedCount ?? 0)} color="var(--accent-red)" />
        <KpiCard label="Aktivní předpisy" value={String(summary?.activePrescriptions ?? 0)} color="var(--accent-orange)" />
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => { setParams({ tab: t.key }); setSearch(''); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PŘEDPISY ─────────────────────────────────────────── */}
      {tab === 'prescriptions' && (
        <PrescriptionsTab
          prescriptions={prescriptions}
          search={search}
          onSearch={setSearch}
          onSelect={setDetailPredpis}
          getPropName={getPropName}
          filterType={filterPresType}
          onFilterType={setFilterPresType}
          filterStatus={filterPresStatus}
          onFilterStatus={setFilterPresStatus}
          onDelete={setDeletePredpis}
        />
      )}

      {/* ── TAB: BANKA ────────────────────────────────────────────── */}
      {tab === 'bank' && (
        <BankTab
          transactions={transactions}
          accounts={accounts}
          search={search}
          onSearch={setSearch}
          importRef={importRef}
          importUctId={importUctId}
          setImportUctId={setImportUctId}
          importMsg={importMsg}
          setImportMsg={setImportMsg}
          onImport={handleImport}
          onSelectTx={setParTx}
          filterType={filterTxType}
          onFilterType={setFilterTxType}
          onDelete={setDeleteTx}
        />
      )}

      {/* ── TAB: PÁROVÁNÍ ─────────────────────────────────────────── */}
      {tab === 'parovani' && (
        <ParovaniTab
          transactions={transactions}
          prescriptions={prescriptions}
          onAutoParovat={handleAutoParovat}
          onParovat={handleParovat}
          autoResult={autoResult}
          getPropName={getPropName}
        />
      )}

      {/* ── TAB: ÚČTY ─────────────────────────────────────────────── */}
      {tab === 'accounts' && <AccountsTab accounts={accounts} />}

      {/* ── TAB: DLUŽNÍCI ─────────────────────────────────────────── */}
      {tab === 'debtors' && <DebtorsTab prescriptions={prescriptions} getPropName={getPropName} getTenantName={getTenantName} />}

      {/* ── MODAL: GENEROVAT ──────────────────────────────────────── */}
      <Modal open={showGen} onClose={() => { setShowGen(false); setGenResult(null); }} title="Generovat předpisy"
        subtitle="Vygeneruje předpisy nájemného pro obsazené jednotky"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setShowGen(false); setGenResult(null); }}>Zavřít</Button>
            <Button variant="primary" onClick={handleGenerate} disabled={!genPropId}>Generovat</Button>
          </div>
        }>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Nemovitost</label>
          <select value={genPropId} onChange={e => setGenPropId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="">-- Vyber nemovitost --</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Měsíc</label>
          <input type="month" value={genMesic} onChange={e => setGenMesic(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
        </div>
        {genResult && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--surface-2)', fontSize: '0.875rem' }}>
            {genResult}
          </div>
        )}
      </Modal>

      {/* ── MODAL: DETAIL PŘEDPISU ────────────────────────────────── */}
      <Modal open={!!detailPredpis} onClose={() => setDetailPredpis(null)}
        title={detailPredpis?.popis || ''} subtitle={detailPredpis ? getPropName(detailPredpis.propId) : ''}
        footer={<Button onClick={() => setDetailPredpis(null)}>Zavřít</Button>}>
        {detailPredpis && (
          <PredpisDetail predpis={detailPredpis} transactions={transactions} getTenantName={getTenantName} />
        )}
      </Modal>

      {/* ── MODAL: KALKULAČKA ──────────────────────────────────────── */}
      {showCalc && <PrescriptionCalc onClose={() => setShowCalc(false)} />}

      {/* ── MODAL: PÁROVÁNÍ Z BANKY ───────────────────────────────── */}
      <Modal open={!!parTx && tab === 'bank'} onClose={() => setParTx(null)}
        title="Párovat transakci"
        subtitle={parTx ? `${parTx.popis} | ${formatKc(parTx.castka)} | VS: ${parTx.vs || '—'}` : ''}>
        {parTx && (
          <ParovaniPicker
            prescriptions={prescriptions.filter(p => p.status !== 'paid')}
            onParovat={(predpisId) => handleParovat(parTx.id, predpisId)}
            getPropName={getPropName}
          />
        )}
      </Modal>

      {/* ── MODAL: SMAZAT PŘEDPIS ──────────────────────────────── */}
      {deletePredpis && (
        <Modal open onClose={() => setDeletePredpis(null)} title="Smazat předpis"
          subtitle={deletePredpis.popis}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeletePredpis(null)}>Zrušit</Button>
              <Button variant="danger" onClick={() => {
                deletePrescriptionMutation.mutate(deletePredpis.id, {
                  onSuccess: () => { setDeletePredpis(null); setDetailPredpis(null); },
                });
              }} disabled={deletePrescriptionMutation.isPending}>
                {deletePrescriptionMutation.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }>
          <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            Opravdu chcete smazat předpis <strong>{deletePredpis.popis}</strong>?
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tato akce je nevratná. Budou smazány i všechny položky předpisu.
          </p>
          {deletePrescriptionMutation.isError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>Nepodařilo se smazat předpis.</div>
          )}
        </Modal>
      )}

      {/* ── MODAL: SMAZAT TRANSAKCI ────────────────────────────── */}
      {deleteTx && (
        <Modal open onClose={() => setDeleteTx(null)} title="Smazat transakci"
          subtitle={`${deleteTx.popis} | ${formatKc(deleteTx.castka)}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteTx(null)}>Zrušit</Button>
              <Button variant="danger" onClick={() => {
                deleteTransactionMutation.mutate(deleteTx.id, {
                  onSuccess: () => setDeleteTx(null),
                });
              }} disabled={deleteTransactionMutation.isPending}>
                {deleteTransactionMutation.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }>
          <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            Opravdu chcete smazat transakci <strong>{deleteTx.popis}</strong>?
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tato akce je nevratná.</p>
          {deleteTransactionMutation.isError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>Nepodařilo se smazat transakci.</div>
          )}
        </Modal>
      )}

      {/* ── MODAL: NOVÝ PŘEDPIS ────────────────────────────────── */}
      {showPrescriptionForm && (
        <PrescriptionForm
          properties={properties as ApiProperty[]}
          onClose={() => setShowPrescriptionForm(false)}
        />
      )}
    </div>
  );
}

// ─── Prescriptions Tab ────────────────────────────────────────────────────────

const PRES_TYPE_LABELS: Record<string, string> = {
  advance: 'Záloha', service: 'Služby', rent: 'Nájem', other: 'Ostatní',
};

const PRES_STATUS_LABELS: Record<string, string> = {
  active: 'Aktivní', inactive: 'Neaktivní', cancelled: 'Zrušený',
};

function PrescriptionsTab({ prescriptions, search, onSearch, onSelect, getPropName, filterType, onFilterType, filterStatus, onFilterStatus, onDelete }: {
  prescriptions: FinPrescription[];
  search: string;
  onSearch: (q: string) => void;
  onSelect: (p: FinPrescription) => void;
  getPropName: (id: unknown) => string;
  filterType: string;
  onFilterType: (v: string) => void;
  filterStatus: string;
  onFilterStatus: (v: string) => void;
  onDelete: (p: FinPrescription) => void;
}) {
  const filtered = useMemo(() => {
    let list = [...prescriptions].sort((a, b) => b.datum.localeCompare(a.datum));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.popis.toLowerCase().includes(q) || getPropName(p.propId).toLowerCase().includes(q));
    }
    return list;
  }, [prescriptions, search, getPropName]);

  const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'muted'> = {
    paid: 'green', partial: 'yellow', pending: 'blue', overdue: 'red',
  };

  const selectStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  };

  const columns: Column<FinPrescription>[] = [
    { key: 'datum', label: 'Datum', render: (p) => <span className="text-muted text-sm">{formatCzDate(p.datum)}</span> },
    { key: 'popis', label: 'Popis', render: (p) => <span style={{ fontWeight: 500 }}>{p.popis}</span> },
    { key: 'typ', label: 'Typ', render: (p) => <Badge variant="blue">{PRES_TYPE_LABELS[p.typ] || p.typ}</Badge> },
    { key: 'propId', label: 'Nemovitost', render: (p) => <span className="text-sm">{getPropName(p.propId)}</span> },
    { key: 'status', label: 'Status', render: (p) => <Badge variant={statusColor[p.status] || 'muted'}>{label(FIN_STATUS_LABELS, p.status)}</Badge> },
    { key: 'castka', label: 'Částka', align: 'right', render: (p) => <span className="font-semibold">{formatKc(p.castka)}</span> },
    { key: 'kUhrade', label: 'K úhradě', align: 'right', render: (p) => (
      <span style={{ color: (p.kUhrade ?? 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
        {formatKc(p.kUhrade ?? 0)}
      </span>
    )},
    { key: 'splatnost', label: 'Splatnost', render: (p) => {
      const overdue = p.splatnost < new Date().toISOString().slice(0, 10) && p.status !== 'paid';
      return <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem' }}>{formatCzDate(p.splatnost)}</span>;
    }},
    { key: 'actions', label: '', render: (p) => (
      <button onClick={(e) => { e.stopPropagation(); onDelete(p); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem' }}>
        Smazat
      </button>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><SearchBar placeholder="Hledat předpisy..." onSearch={onSearch} /></div>
        <select value={filterType} onChange={(e) => onFilterType(e.target.value)} style={selectStyle}>
          <option value="">Všechny typy</option>
          {Object.entries(PRES_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => onFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Aktivní</option>
          {Object.entries(PRES_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Table data={filtered} columns={columns} rowKey={p => p.id} onRowClick={onSelect} emptyText="Žádné předpisy. Klikni na Generovat předpisy." />
    </div>
  );
}

// ─── Bank Tab ─────────────────────────────────────────────────────────────────

const TX_TYPE_LABELS: Record<string, string> = {
  credit: 'Příjem', debit: 'Výdaj',
};

function BankTab({ transactions, accounts, search, onSearch, importRef, importUctId, setImportUctId, importMsg, setImportMsg, onImport, onSelectTx, filterType, onFilterType, onDelete }: {
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

// ─── Parovani Tab ─────────────────────────────────────────────────────────────

function ParovaniTab({ transactions, prescriptions, onAutoParovat, onParovat, autoResult, getPropName }: {
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

// ─── Accounts Tab ─────────────────────────────────────────────────────────────

function AccountsTab({ accounts }: { accounts: FinAccount[] }) {
  const columns: Column<FinAccount>[] = [
    { key: 'nazev', label: 'Název', render: u => <span style={{ fontWeight: 600 }}>{u.nazev}</span> },
    { key: 'cislo', label: 'Číslo účtu', render: u => <span style={{ fontFamily: 'monospace' }}>{u.cislo}</span> },
    { key: 'typ', label: 'Typ', render: u => <Badge variant="blue">{u.typ}</Badge> },
    { key: 'zustatek', label: 'Zůstatek', align: 'right', render: u => (
      <span style={{ fontWeight: 600, color: u.zustatek >= 0 ? 'var(--success)' : 'var(--danger)' }}>
        {formatKc(u.zustatek)}
      </span>
    )},
  ];

  return <Table data={accounts} columns={columns} rowKey={u => u.id} emptyText="Žádné účty" />;
}

// ─── Debtors Tab ──────────────────────────────────────────────────────────────

function DebtorsTab({ prescriptions, getPropName, getTenantName }: {
  prescriptions: FinPrescription[];
  getPropName: (id: unknown) => string;
  getTenantName: (id?: string | null) => string;
}) {
  const dluznici = useMemo(() => {
    const map = new Map<string, { celkem: number; predpisy: FinPrescription[] }>();
    for (const p of prescriptions) {
      if (!p.tenantId || p.status === 'paid') continue;
      const kUhrade = p.kUhrade ?? 0;
      if (kUhrade <= 0) continue;
      const entry = map.get(p.tenantId) || { celkem: 0, predpisy: [] };
      entry.celkem += kUhrade;
      entry.predpisy.push(p);
      map.set(p.tenantId, entry);
    }
    return Array.from(map.entries())
      .map(([tenantId, data]) => ({ tenantId, ...data }))
      .sort((a, b) => b.celkem - a.celkem);
  }, [prescriptions]);

  if (dluznici.length === 0) {
    return <EmptyState title="Žádní dlužníci" description="Všechny předpisy jsou uhrazeny." />;
  }

  const total = dluznici.reduce((s, d) => s + d.celkem, 0);

  return (
    <div>
      <div className="text-muted text-sm" style={{ marginBottom: 12 }}>
        Dlužníků: {dluznici.length} | Celková pohledávka: {formatKc(total)}
      </div>
      {dluznici.map(d => (
        <div key={d.tenantId} style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>{getTenantName(d.tenantId)}</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger)' }}>{formatKc(d.celkem)}</div>
          </div>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <tbody>
              {d.predpisy.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 16px' }}>{p.popis}</td>
                  <td style={{ padding: '8px 16px' }} className="text-muted">{getPropName(p.propId)}</td>
                  <td style={{ padding: '8px 16px' }} className="text-muted">splatnost: {formatCzDate(p.splatnost)}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{formatKc(p.kUhrade ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Predpis Detail ───────────────────────────────────────────────────────────

function PredpisDetail({ predpis, transactions, getTenantName }: {
  predpis: FinPrescription;
  transactions: FinTransaction[];
  getTenantName: (id?: string | null) => string;
}) {
  const matched = transactions.filter(t => (t.parovani || []).includes(predpis.id));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: '0.875rem' }}>
        <div>
          <div className="text-muted">Nájemce</div>
          <div style={{ fontWeight: 500 }}>{getTenantName(predpis.tenantId)}</div>
        </div>
        <div>
          <div className="text-muted">Status</div>
          <Badge variant={predpis.status === 'paid' ? 'green' : predpis.status === 'overdue' ? 'red' : 'yellow'}>
            {label(FIN_STATUS_LABELS, predpis.status)}
          </Badge>
        </div>
        <div>
          <div className="text-muted">Celková částka</div>
          <div style={{ fontWeight: 600 }}>{formatKc(predpis.castka)}</div>
        </div>
        <div>
          <div className="text-muted">K úhradě</div>
          <div style={{ fontWeight: 600, color: (predpis.kUhrade ?? 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {formatKc(predpis.kUhrade ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-muted">Datum</div>
          <div>{formatCzDate(predpis.datum)}</div>
        </div>
        <div>
          <div className="text-muted">Splatnost</div>
          <div>{formatCzDate(predpis.splatnost)}</div>
        </div>
      </div>
      {matched.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.875rem' }}>Spárované platby</div>
          {matched.map(t => (
            <div key={t.id} style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>{t.popis} <span className="text-muted">({formatCzDate(t.datum)})</span></span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>+{formatKc(t.castka)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Parovani Picker ──────────────────────────────────────────────────────────

function ParovaniPicker({ prescriptions, onParovat, getPropName }: {
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

// ─── Prescription Form ─────────────────────────────────────────────────────────

function PrescriptionForm({ properties, onClose }: {
  properties: ApiProperty[];
  onClose: () => void;
}) {
  const createMutation = useCreatePrescription();
  const [form, setForm] = useState({
    propertyId: '',
    unitId: '',
    type: 'rent' as string,
    amount: '',
    dueDay: '15',
    variableSymbol: '',
    description: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const selectedProperty = properties.find(p => p.id === form.propertyId);
  const availableUnits = selectedProperty?.units ?? [];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.propertyId) errs.propertyId = 'Povinné';
    if (!form.description.trim()) errs.description = 'Povinné';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Zadejte částku';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate(
      {
        propertyId: form.propertyId,
        unitId: form.unitId || undefined,
        type: form.type,
        amount: Number(form.amount),
        dueDay: Number(form.dueDay) || 15,
        variableSymbol: form.variableSymbol || undefined,
        description: form.description.trim(),
        validFrom: form.validFrom,
        validTo: form.validTo || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  const inputStyle = (field?: string) => ({
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    boxSizing: 'border-box' as const,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))',
    color: 'var(--text)',
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Nový předpis"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Vytvářím...' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Nemovitost *</label>
          <select value={form.propertyId} onChange={e => { set('propertyId', e.target.value); set('unitId', ''); }} style={inputStyle('propertyId')}>
            <option value="">— vyberte —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {errors.propertyId && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.propertyId}</div>}
        </div>
        {availableUnits.length > 0 && (
          <div>
            <label className="form-label">Jednotka</label>
            <select value={form.unitId} onChange={e => set('unitId', e.target.value)} style={inputStyle()}>
              <option value="">— bez jednotky —</option>
              {availableUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Typ *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle()}>
            {Object.entries(PRES_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Částka (Kč) *</label>
          <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" style={inputStyle('amount')} />
          {errors.amount && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.amount}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Splatnost (den v měsíci)</label>
          <input type="number" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} min="1" max="28" style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Variabilní symbol</label>
          <input value={form.variableSymbol} onChange={e => set('variableSymbol', e.target.value)} placeholder="volitelný" style={inputStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="form-label">Popis *</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Popis předpisu" style={inputStyle('description')} />
        {errors.description && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.description}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="form-label">Platnost od</label>
          <input type="date" value={form.validFrom} onChange={e => set('validFrom', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label className="form-label">Platnost do</label>
          <input type="date" value={form.validTo} onChange={e => set('validTo', e.target.value)} style={inputStyle()} />
        </div>
      </div>

      {createMutation.isError && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>Nepodařilo se vytvořit předpis.</div>
      )}
    </Modal>
  );
}
