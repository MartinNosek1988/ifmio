import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap, Link2, Calculator, Plus } from 'lucide-react';
import { KpiCard, Button, Modal } from '../../shared/components';
import { formatKc } from '../../shared/utils/format';
import type { FinTransaction, FinPrescription } from './types';
import { useToast } from '../../shared/components/toast/Toast';
import { useBankAccounts, useTransactions, useImportTransactions, usePrescriptions, useMatchTransactions, useMatchSingle, useFinanceSummary, useDeletePrescription, useDeleteTransaction, useAutoMatch, useMatchAll } from './api/finance.queries';
import { mapAccount, mapTransaction, mapPrescription } from './api/finance.mappers';
import { useProperties } from '../properties/use-properties';
import { useResidents } from '../residents/api/residents.queries';
import { PrescriptionCalc } from './calc/PrescriptionCalc';
import type { ApiProperty } from '../properties/properties-api';

// Tab components
import { PrescriptionsTab } from './components/PrescriptionsTab';
import { BankTab } from './components/BankTab';
import { DokladyTab } from './components/DokladyTab';
import { ParovaniTab } from './components/ParovaniTab';
import { AccountsTab } from './components/AccountsTab';
import DebtorsTabV2 from './components/DebtorsTabV2';
import KontoTab from './components/KontoTab';
import RemindersTab from './components/RemindersTab';
import InitialBalancesTab from './components/InitialBalancesTab';
import SettlementPage from '../settlement/SettlementPage';
import PohodaExportSection from './components/PohodaExportSection';
import SipoTab from './sipo/SipoTab';
import ComponentsTab from './components/ComponentsTab';

// Modal components
import { PredpisDetail } from './components/PredpisDetail';
import { ParovaniPicker } from './components/ParovaniTab';
import { PrescriptionForm } from './components/PrescriptionForm';
import GenerateFromComponentsWizard from './components/GenerateFromComponentsWizard';
import MatchingModal from './components/MatchingModal';

const TABS = [
  { key: 'components', label: 'Složky předpisu' },
  { key: 'prescriptions', label: 'Předpisy' },
  { key: 'bank', label: 'Banka' },
  { key: 'doklady', label: 'Doklady' },
  { key: 'parovani', label: 'Párování' },
  { key: 'konto', label: 'Konto' },
  { key: 'debtors', label: 'Dlužníci' },
  { key: 'reminders', label: 'Upomínky' },
  { key: 'accounts', label: 'Účty' },
  { key: 'initial', label: 'Počáteční stavy' },
  { key: 'settlement', label: 'Vyúčtování' },
  { key: 'export', label: 'Export' },
  { key: 'sipo', label: 'SIPO' },
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

  // Generate modal — property picker then components wizard
  const [showGen, setShowGen] = useState(false);
  const [genPropId, setGenPropId] = useState('');

  // Enhanced matching
  const autoMatchMut = useAutoMatch();
  const matchAllMut = useMatchAll();
  const [autoMatchResult, setAutoMatchResult] = useState<any>(null);
  const [matchingTx, setMatchingTx] = useState<FinTransaction | null>(null);

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

  const handleEnhancedAutoMatch = () => {
    autoMatchMut.mutate({}, {
      onSuccess: (res) => {
        setAutoMatchResult(res);
        toast.success(`Auto-párování: ${res.matched} spárováno, ${res.unmatched} nespárováno`);
      },
      onError: () => toast.error('Auto-párování selhalo'),
    });
  };

  const handleMatchAll = () => {
    if (properties.length === 0) return;
    // Match all for all properties
    matchAllMut.mutate(properties[0]?.id ?? '', {
      onSuccess: (res) => {
        setAutoMatchResult(res);
        toast.success(res.summary);
      },
      onError: () => toast.error('Párování selhalo'),
    });
  };

  const handleTxClick = (tx: FinTransaction) => {
    if (tab === 'bank') {
      setMatchingTx(tx);
    } else {
      setParTx(tx);
    }
  };

  const handleGenerateClose = () => {
    setShowGen(false);
    setGenPropId('');
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
    <div data-testid="finance-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowPrescriptionForm(true)} data-testid="finance-new-prescription-btn">Nový předpis</Button>
          <Button icon={<Calculator size={15} />} onClick={() => setShowCalc(true)} data-testid="finance-calc-btn">Kalkulačka</Button>
          <Button icon={<Zap size={15} />} onClick={() => setShowGen(true)} data-testid="finance-generate-btn">Generovat předpisy</Button>
          <Button icon={<Link2 size={15} />} onClick={handleAutoParovat} data-testid="finance-auto-match-btn">Auto-párovat</Button>
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
            data-testid={`finance-tab-${t.key}`}
            onClick={() => { setParams({ tab: t.key }); setSearch(''); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: SLOŽKY PŘEDPISU ──────────────────────────────────── */}
      {tab === 'components' && <ComponentsTab />}

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
          onSelectTx={handleTxClick}
          filterType={filterTxType}
          onFilterType={setFilterTxType}
          onDelete={setDeleteTx}
          onAutoMatch={handleEnhancedAutoMatch}
          onMatchAll={handleMatchAll}
          autoMatchResult={autoMatchResult}
          onDismissAutoResult={() => setAutoMatchResult(null)}
          isAutoMatching={autoMatchMut.isPending}
          isMatchingAll={matchAllMut.isPending}
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
      {tab === 'accounts' && <AccountsTab />}

      {/* ── TAB: KONTO ────────────────────────────────────────────── */}
      {tab === 'konto' && <KontoTab />}

      {/* ── TAB: DLUŽNÍCI ─────────────────────────────────────────── */}
      {tab === 'debtors' && <DebtorsTabV2 />}

      {/* ── TAB: UPOMÍNKY ─────────────────────────────────────────── */}
      {tab === 'reminders' && <RemindersTab />}

      {/* ── TAB: POČÁTEČNÍ STAVY ─────────────────────────────────── */}
      {tab === 'initial' && <InitialBalancesTab />}

      {/* ── TAB: VYÚČTOVÁNÍ ──────────────────────────────────────── */}
      {tab === 'settlement' && <SettlementPage />}

      {/* ── TAB: EXPORT ──────────────────────────────────────────── */}
      {tab === 'export' && <PohodaExportSection />}

      {/* ── TAB: SIPO ────────────────────────────────────────────── */}
      {tab === 'sipo' && <SipoTab />}

      {/* ── MODAL: GENEROVAT — property picker then components wizard */}
      {showGen && !genPropId && (
        <Modal open onClose={handleGenerateClose} title="Generovat předpisy ze složek"
          subtitle="Vyberte nemovitost, pro kterou chcete vygenerovat předpisy"
          data-testid="generate-property-picker"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={handleGenerateClose}>Zrušit</Button>
            </div>
          }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {properties.map(p => (
              <button key={p.id} onClick={() => setGenPropId(p.id)}
                data-testid={`generate-pick-property-${p.id}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text)', fontSize: '0.9rem',
                }}>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                <span className="text-muted text-sm">{p.address || ''}</span>
              </button>
            ))}
            {properties.length === 0 && (
              <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
                Nemáte žádné nemovitosti. Nejdřív vytvořte nemovitost.
              </div>
            )}
          </div>
        </Modal>
      )}
      {showGen && genPropId && (
        <GenerateFromComponentsWizard propertyId={genPropId} onClose={handleGenerateClose} />
      )}

      {/* ── MODAL: DETAIL PŘEDPISU ────────────────────────────────── */}
      <Modal open={!!detailPredpis} onClose={() => setDetailPredpis(null)}
        title={detailPredpis?.popis || ''} subtitle={detailPredpis ? getPropName(detailPredpis.propId) : ''}
        footer={<div style={{ display: 'flex', gap: 8 }}>
          {detailPredpis && (
            <>
              <Button onClick={() => window.open(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/pdf/prescriptions/${detailPredpis.id}/pdf?type=predpis`, '_blank')}>Stáhnout předpis</Button>
              <Button onClick={() => window.open(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/pdf/prescriptions/${detailPredpis.id}/pdf?type=faktura`, '_blank')}>Stáhnout fakturu</Button>
            </>
          )}
          <Button onClick={() => setDetailPredpis(null)}>Zavřít</Button>
        </div>}>
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

      {/* ── MODAL: MATCHING (enhanced) ──────────────────────────── */}
      {matchingTx && (
        <MatchingModal
          tx={matchingTx}
          onClose={() => setMatchingTx(null)}
        />
      )}
    </div>
  );
}
