import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, Zap, Link2, Calculator, Plus, FileText, Download, Users } from 'lucide-react';
import { KpiCard, Table, Badge, SearchBar, Button, EmptyState, Modal } from '../../shared/components';
import type { Column } from '../../shared/components';
import { formatKc, formatCzDate } from '../../shared/utils/format';
import { FIN_STATUS_LABELS, label } from '../../constants/labels';
import type { FinTransaction, FinPrescription, FinAccount } from './types';
import { useToast } from '../../shared/components/toast/Toast';
import { useBankAccounts, useTransactions, useImportTransactions, usePrescriptions, useGeneratePrescriptions, useMatchTransactions, useMatchSingle, useFinanceSummary, useDeletePrescription, useDeleteTransaction, useCreatePrescription, useInvoices, useInvoiceStats, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useMarkInvoicePaid, useImportIsdoc, useExportIsdoc } from './api/finance.queries';
import type { ApiInvoice } from './api/finance.api';
import { mapAccount, mapTransaction, mapPrescription } from './api/finance.mappers';
import { useProperties } from '../properties/use-properties';
import { useResidents } from '../residents/api/residents.queries';
import { PrescriptionCalc } from './calc/PrescriptionCalc';
import type { ApiProperty } from '../properties/properties-api';

const TABS = [
  { key: 'prescriptions', label: 'Předpisy' },
  { key: 'bank', label: 'Banka' },
  { key: 'doklady', label: 'Doklady' },
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

      {/* ── TAB: DOKLADY ──────────────────────────────────────────── */}
      {tab === 'doklady' && (
        <DokladyTab transactions={transactions} />
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

// ─── Doklady Tab ───────────────────────────────────────────────────────────────

const INVOICE_TYPE_LABELS: Record<string, string> = {
  received: 'Přijatá', issued: 'Vydaná', proforma: 'Záloha', credit_note: 'Dobropis',
};

function DokladyTab({ transactions }: { transactions: FinTransaction[] }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPaid, setFilterPaid] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState<ApiInvoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiInvoice | null>(null);

  const { data: invData } = useInvoices({
    ...(filterType ? { type: filterType } : {}),
    ...(filterPaid ? { isPaid: filterPaid } : {}),
    ...(search ? { search } : {}),
    limit: 200,
  });
  const invoices = invData?.data ?? [];
  const { data: stats } = useInvoiceStats();
  const deleteMut = useDeleteInvoice();
  const markPaidMut = useMarkInvoicePaid();
  const importIsdocMut = useImportIsdoc();
  const exportIsdocMut = useExportIsdoc();
  const isdocRef = useRef<HTMLInputElement>(null);

  const handleIsdocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    // .isdocx is a ZIP containing the XML
    if (file.name.endsWith('.isdocx')) {
      try {
        // Try reading as text first (some .isdocx are just XML)
        if (text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
          importIsdocMut.mutate(text);
        } else {
          // Can't parse ZIP without a library — treat the raw text
          importIsdocMut.mutate(text);
        }
      } catch {
        importIsdocMut.mutate(text);
      }
    } else {
      importIsdocMut.mutate(text);
    }
    if (isdocRef.current) isdocRef.current.value = '';
  };

  const handleExport = (inv: ApiInvoice) => {
    exportIsdocMut.mutate(inv.id, {
      onSuccess: (xml) => {
        const blob = new Blob([typeof xml === 'string' ? xml : JSON.stringify(xml)], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.number}.isdoc`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  };

  const selectStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  };

  const columns: Column<ApiInvoice>[] = [
    { key: 'number', label: 'Číslo', render: (i) => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
        {i.number}
        {i.isdocXml && <span style={{ fontSize: '0.62rem', background: '#1e3a5f', color: '#93c5fd', borderRadius: 3, padding: '0 4px', marginLeft: 4 }}>ISDOC</span>}
      </span>
    ) },
    { key: 'type', label: 'Typ', render: (i) => <Badge variant="blue">{INVOICE_TYPE_LABELS[i.type] || i.type}</Badge> },
    { key: 'supplierName', label: 'Dodavatel/Odběratel', render: (i) => (
      <span style={{ fontWeight: 500 }}>{i.type === 'issued' ? (i.buyerName || '—') : (i.supplierName || '—')}</span>
    ) },
    { key: 'description', label: 'Popis', render: (i) => <span className="text-muted text-sm">{i.description || '—'}</span> },
    { key: 'amountTotal', label: 'Částka', align: 'right', render: (i) => (
      <div>
        <div style={{ fontWeight: 600 }}>{formatKc(i.amountTotal)}</div>
        {i.vatRate > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>základ {formatKc(i.amountBase)} + {i.vatRate}% DPH</div>}
      </div>
    ) },
    { key: 'dueDate', label: 'Splatnost', render: (i) => {
      if (!i.dueDate) return <span className="text-muted">—</span>;
      const overdue = !i.isPaid && i.dueDate < new Date().toISOString().slice(0, 10);
      return <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: overdue ? 600 : 400 }}>{formatCzDate(i.dueDate)}</span>;
    } },
    { key: 'isPaid', label: 'Stav', render: (i) => {
      if (i.isPaid) return <Badge variant="green">Uhrazeno</Badge>;
      const overdue = i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10);
      return <Badge variant={overdue ? 'red' : 'yellow'}>{overdue ? 'Po splatnosti' : 'Čeká'}</Badge>;
    } },
    { key: 'actions', label: '', render: (i) => (
      <div style={{ display: 'flex', gap: 4 }}>
        {!i.isPaid && (
          <button onClick={(e) => { e.stopPropagation(); markPaidMut.mutate(i.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', fontSize: '0.78rem' }} title="Uhradit">
            ✓
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); handleExport(i); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem' }} title="Export ISDOC">
          <Download size={13} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(i); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.78rem' }}>
          Smazat
        </button>
      </div>
    ) },
  ];

  return (
    <div>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Celkem dokladů" value={String(stats?.total ?? 0)} color="var(--accent-blue)" />
        <KpiCard label="Neuhrazené" value={String(stats?.unpaid ?? 0)} color="var(--accent-orange)" />
        <KpiCard label="Po splatnosti" value={String(stats?.overdue ?? 0)} color="var(--accent-red)" />
        <KpiCard label="Celková částka" value={formatKc(stats?.totalAmount ?? 0)} color="var(--accent-green)" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar placeholder="Hledat doklady..." onSearch={setSearch} />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
          <option value="">Všechny typy</option>
          {Object.entries(INVOICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPaid} onChange={(e) => setFilterPaid(e.target.value)} style={selectStyle}>
          <option value="">Vše</option>
          <option value="false">Neuhrazené</option>
          <option value="true">Uhrazené</option>
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem' }}>
          <FileText size={15} /> Import ISDOC
          <input ref={isdocRef} type="file" accept=".isdoc,.isdocx,.xml" onChange={handleIsdocImport} style={{ display: 'none' }} />
        </label>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setEditInvoice(null); setShowForm(true); }}>Nový doklad</Button>
      </div>

      {importIsdocMut.isSuccess && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: '0.85rem', color: 'var(--success)' }}>
          ISDOC doklad úspěšně importován
        </div>
      )}
      {importIsdocMut.isError && (
        <div style={{ background: '#2d1b1b', border: '1px solid #ef4444', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: '0.85rem', color: '#ef4444' }}>
          Chyba při importu ISDOC
        </div>
      )}

      <Table data={invoices} columns={columns} rowKey={(i) => i.id} onRowClick={(i) => setDetailInvoice(i)} emptyText="Žádné doklady. Přidejte nový doklad nebo importujte ISDOC." />

      {/* Detail modal */}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onEdit={() => { setEditInvoice(detailInvoice); setShowForm(true); setDetailInvoice(null); }}
          onMarkPaid={() => { markPaidMut.mutate(detailInvoice.id, { onSuccess: () => setDetailInvoice(null) }); }}
          onExport={() => handleExport(detailInvoice)}
          onDelete={() => { setDeleteTarget(detailInvoice); setDetailInvoice(null); }}
        />
      )}

      {/* Form modal */}
      {showForm && (
        <InvoiceForm
          invoice={editInvoice}
          transactions={transactions}
          onClose={() => { setShowForm(false); setEditInvoice(null); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="Smazat doklad"
          subtitle={deleteTarget.number}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteTarget(null)}>Zrušit</Button>
              <Button variant="danger" onClick={() => {
                deleteMut.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
              }} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }>
          <p style={{ fontSize: '0.9rem' }}>Opravdu smazat doklad <strong>{deleteTarget.number}</strong>?</p>
        </Modal>
      )}
    </div>
  );
}

// ─── Invoice Detail Modal ───────────────────────────────────────────────────────

function InvoiceDetailModal({ invoice, onClose, onEdit, onMarkPaid, onExport, onDelete }: {
  invoice: ApiInvoice;
  onClose: () => void;
  onEdit: () => void;
  onMarkPaid: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const overdue = !invoice.isPaid && invoice.dueDate && invoice.dueDate < new Date().toISOString().slice(0, 10);

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );

  return (
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
            {!invoice.isPaid && <Button variant="primary" onClick={onMarkPaid}>Uhradit</Button>}
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
      {row('Variabilní symbol', invoice.variableSymbol)}
      {row('Měna', invoice.currency || 'CZK')}

      {/* Supplier */}
      {(invoice.supplierName || invoice.supplierIco) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Dodavatel</div>
          {row('Název', invoice.supplierName)}
          {invoice.supplierIco && row('IČO', invoice.supplierIco)}
          {invoice.supplierDic && row('DIČ', invoice.supplierDic)}
        </div>
      )}

      {/* Buyer */}
      {(invoice.buyerName || invoice.buyerIco) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Odběratel</div>
          {row('Název', invoice.buyerName)}
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
  );
}

// ─── Invoice Form ──────────────────────────────────────────────────────────────

function InvoiceForm({ invoice, transactions, onClose }: {
  invoice: ApiInvoice | null;
  transactions: FinTransaction[];
  onClose: () => void;
}) {
  const createMut = useCreateInvoice();
  const updateMut = useUpdateInvoice();
  const isEdit = !!invoice;
  const [showContactPicker, setShowContactPicker] = useState<'supplier' | 'buyer' | null>(null);

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
    transactionId: invoice?.transactionId || '',
    note: invoice?.note || '',
    isPaid: invoice?.isPaid || false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const recalcVat = (base: string, rate: string) => {
    const b = parseFloat(base) || 0;
    const r = parseInt(rate) || 0;
    const vat = Math.round(b * r / 100);
    setForm(f => ({ ...f, amountBase: base, vatRate: rate, vatAmount: String(vat), amountTotal: String(b + vat) }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.number.trim()) errs.number = 'Povinné';
    if (!form.amountBase || Number(form.amountBase) <= 0) errs.amountBase = 'Zadejte částku';
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
      transactionId: form.transactionId || undefined,
      note: form.note || undefined,
      isPaid: form.isPaid,
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
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }>

      {/* Row 1: number + type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Číslo dokladu *</label>
          <input value={form.number} onChange={e => set('number', e.target.value)} style={inputStyle('number')} />
          {errors.number && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>{errors.number}</div>}
        </div>
        <div>
          <label className="form-label">Typ</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle()}>
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
          <input value={form.supplierIco} onChange={e => set('supplierIco', e.target.value)} style={inputStyle()} />
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
          <input value={form.buyerIco} onChange={e => set('buyerIco', e.target.value)} style={inputStyle()} />
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

      {/* Row 5: amounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label className="form-label">Základ (Kč) *</label>
          <input type="number" value={form.amountBase} onChange={e => recalcVat(e.target.value, form.vatRate)} style={inputStyle('amountBase')} placeholder="0" />
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
          <input type="date" value={form.issueDate} onChange={e => set('issueDate', e.target.value)} style={inputStyle('issueDate')} />
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

// ─── Contact Picker Modal ───────────────────────────────────────────────────────

function ContactPickerModal({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (contact: { firstName: string; lastName: string; email?: string; phone?: string }) => void;
}) {
  const [search, setSearch] = useState('');
  const { data: resData } = useResidents({ limit: 200 });
  const residents = resData?.data ?? [];

  const filtered = residents.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      (r.email?.toLowerCase().includes(q)) ||
      (r.phone?.includes(q));
  });

  return (
    <Modal open onClose={onClose} title="Vybrat z adresáře">
      <div style={{ marginBottom: 12 }}>
        <SearchBar placeholder="Hledat kontakt..." onSearch={setSearch} />
      </div>
      <div style={{ maxHeight: 350, overflow: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Žádné kontakty</div>
        )}
        {filtered.map(r => (
          <div key={r.id} onClick={() => onSelect(r)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2, rgba(255,255,255,0.05))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.firstName} {r.lastName}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {r.role === 'owner' ? 'Vlastník' : r.role === 'tenant' ? 'Nájemník' : r.role === 'member' ? 'Člen' : 'Kontakt'}
                {r.email && ` · ${r.email}`}
              </div>
            </div>
            {r.property && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.property.name}</span>
            )}
          </div>
        ))}
      </div>
    </Modal>
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
